const axios = require('axios');

const api = axios.create({
  baseURL: 'https://server-yape.vercel.app/api/query',
  headers: { 'x-api-key': 'MELEYS' },
  timeout: 5000,
});

async function buscarPagoPorOperacion(cip) {
  try {
    const { data } = await api.get(`/payment/${cip}`);

    return { ok: true, data, message: '' };
  } catch (error) {
    if (error.response?.status === 404) {
      return { ok: false, data: null, message: `No se encontró ningún pago con el código ${cip}` };
    }

    console.error('[API] buscarPagoPorOperacion:', error.response?.data || error.message);

    return { ok: false, data: null, message: 'No se pudo consultar la información del pago.' };
  }
}

async function buscarCodigoRegistroPorEmail(email) {
  try {
    const { data } = await api.get('/register', { params: { email } });

    if (!data?.code) {
      return { ok: false, data: null, message: 'Esta cuenta ya fue activada.' };
    }

    return { ok: true, data, message: '' };
  } catch (error) {
    if (error.response?.status === 404) {
      return { ok: false, data: null, message: 'No encontramos un código de activación para este correo.' };
    }

    console.error('[API] buscarCodigoRegistroPorEmail:', error.response?.data || error.message);

    return {
      ok: false,
      data: null,
      message: 'No se pudo consultar el código de activación.',
    };
  }
}

module.exports = {
  buscarPagoPorOperacion,
  buscarCodigoRegistroPorEmail,
};
