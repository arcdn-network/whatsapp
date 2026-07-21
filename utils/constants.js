const { TITLE_PRODUCT, PRICE_PRODUCT, FILE_APK, MAIN_MENU_MESSAGE, TUTORIALES_MESSAGE } = require('./data');
const { MSG_HELP_1, MSG_HELP_2, MSG_HELP_3 } = require('./data');
const YEAR = new Date().getFullYear();

const COMMAND_TUTORIALS = {
  '/tutorial': {
    text: TUTORIALES_MESSAGE,
  },
  '/escanear': {
    video: 'videos/escanear.mp4',
    text: [
      '📷 *Función Escanear*',
      '',
      'Sube una imagen nítida y legible para que la app pueda extraer correctamente la información.',
      '',
      'Puedes usarla de tres formas:',
      '',
      '1️⃣ *Imagen de QR*',
      'Sube una imagen del QR donde se visualice el texto (IMPORTANTE).',
      '',
      '2️⃣ *Voucher de Yape*',
      'Sube una captura del comprobante.',
      'La app identificará el nombre del titular y sus 3 últimos dígitos.',
      '',
      '3️⃣ Screenshot *(Solo iPhone)*',
      'Al momento de buscar el titular de línea, toma un screenshot y súbelo.',
      'La app se encargará de extraer la información.',
    ].join('\n'),
  },
  '/autocompletar': {
    video: 'videos/autocompletar.mp4',
    text: [
      '⚡ *Autocompletado Manual*',
      '',
      '1️⃣ Ve a la sección *Mis contactos*',
      '2️⃣ Guarda el nombre y número',
      '3️⃣ Listo! Ya puedes yapear',
    ].join('\n'),
  },
};

const COMMAND_RESPONSES = {
  'buenos dias': {
    text: 'Hola, en que puedo ayudarte?',
  },
  [MSG_HELP_1]: {
    text: 'Hola, en que puedo ayudarte?',
  },
  [MSG_HELP_2]: {
    text: 'Hola, en que puedo ayudarte?',
  },
  [MSG_HELP_3]: {
    text: 'Hola, eres Android o Iphone?',
  },
  'hola informacion sobre el yape.': {
    image: 'yape.png',
    text: YAPE_MESSAGE(),
  },
  '/info': {
    image: 'yape.png',
    text: YAPE_MESSAGE(),
  },
  '/menu': {
    text: MAIN_MENU_MESSAGE,
  },
  '/pagar': () => [
    {
      image: 'qr.png',
      text: getPaymentYapeMessage(),
    },
    {
      gif: 'videos/escanear_qr.mp4',
      text: QR_MESSAGE(),
    },
  ],
  '/qr': {
    image: 'qr.png',
  },
  '/apk': [
    {
      text: [
        '📦 Aquí tienes la aplicación.',
        '',
        'Instálala en tu dispositivo 📲',
        'Luego crea tu cuenta ✍️ dentro de la app.',
        '',
        'Cuando termines, envíame el correo con el que te registraste para activar tu licencia ✅',
      ].join('\n'),
    },
    {
      file: FILE_APK,
      text: null,
    },
  ],
  '/app': [
    {
      text: [
        '📦 Aquí tienes la aplicación.',
        '',
        'Instálala en tu dispositivo 📲 ',
        '',
        '✅ Si es tu primera vez, click *"Crear una cuenta"*.',
        '✅ Si ya eres cliente, click *"Ya tengo una Cuenta Yape"* e ingresa con el mismo correo con el que se activó tu licencia.',
      ].join('\n'),
    },
    {
      file: FILE_APK,
      text: null,
    },
  ],
  '/android': () => [
    {
      text: [
        '🤖 *Cómo instalar en Android*',
        '',
        '1️⃣ Abre el link desde *Chrome* o *Brave*.',
        '2️⃣ Toca los *3 puntos* (⋮) en la esquina superior derecha.',
        '3️⃣ Selecciona *"Agregar a pantalla de inicio"*',
        '4️⃣ Confirma tocando *"Instalar"*.',
        '',
        '✅ Listo, ya tienes el ícono en tu celular.',
        '',
        '👇 Aquí tienes un tutorial:',
      ].join('\n'),
    },
    {
      gif: 'videos/android.mp4',
    },
  ],
  '/iphone': () => [
    {
      text: [
        '🍏 *Cómo instalar en iPhone*',
        '',
        '1️⃣ Abre el link desde *Safari*',
        '2️⃣ Busca el ícono de *Compartir* 📤 (un cuadrado con una flecha hacia arriba).',
        '3️⃣ Desliza y selecciona *"Agregar a inicio"*.',
        '4️⃣ Toca *"Agregar"* (arriba a la derecha).',
        '',
        '✅ Listo, ya tienes el ícono en tu celular.',
        '',
        '👇 Aquí tienes un tutorial:',
      ].join('\n'),
    },
    {
      gif: 'videos/iphone.mp4',
    },
  ],
  '/activacion': {
    text: [
      '🔐 *Activación de licencia*',
      '',
      'Si realizaste el pago con *PagoEfectivo*, espera aproximadamente *1 minuto* para que el sistema registre el pago.',
      '',
      'Una vez confirmado el pago o activación, actualiza la aplicación de cualquiera de estas formas:',
      '',
      '1️⃣ *Cerrar sesión y volver a ingresar*',
      '• Presiona el ícono de la *personita* en la parte superior.',
      '• Busca la opción *Cerrar sesión*.',
      '• Vuelve a iniciar sesión en la aplicación.',
      '',
      '2️⃣ *Reiniciar la aplicación*',
      '• Cierra completamente la app.',
      '• Ábrela nuevamente para que se reflejen los cambios.',
      '',
      '📌 *Si realizaste el pago a un distribuidor autorizado*',
      '• Debes esperar a que el distribuidor responda y valide tu pago.',
    ].join('\n'),
  },
  '/soporte': {
    text: [
      '⚙️ *Soporte y mejoras de la aplicación*',
      '',
      'Si detectaste un error, diferencia o deseas sugerir una mejora, envíame una *captura de pantalla* donde se vea claramente la observación.',
      '',
      'Para poder revisarlo incluye:',
      '• Una breve explicación de lo que ocurre.',
      '• Señala con un *lápiz* la parte donde está el problema.',
      '• El modelo de tu teléfono (opcional).',
      '',
      'Con esa información podré revisarlo para corregir o mejorar la aplicación.',
    ].join('\n'),
  },
  '/estafas': {
    text: [
      '❗ *Aviso importante*',
      '',
      'No realizamos ventas por TikTok, Facebook ni otros números de WhatsApp. Solo atendemos por este número.',
      '',
      'Si realizaste un pago a una persona no autorizada o alguien utilizó mi producto para engañarte, lamentablemente no tengo control sobre esas acciones.',
      '',
      '⚠️ Recuerda que:',
      '• Las advertencias se muestran al momento de registrarte.',
      '• Mi número siempre aparece en la *marca de agua* del contenido.',
      '• La aplicación es pública y puede descargarse gratis desde mi perfil.',
    ].join('\n'),
  },
  ...COMMAND_TUTORIALS,
};

function YAPE_MESSAGE() {
  return [
    `🚀 *${TITLE_PRODUCT} - ${YEAR}*`,
    '',
    'Activa tu licencia de forma segura aquí.',
    `💰 *Precio:* S/ ${PRICE_PRODUCT}`,
    '',
    '✅ *Pago único*',
    '✅ *Acceso permanente*',
    '✅ *Actualizaciones automáticas*',
    '',
    'Si deseas adquirirlo, escribe: `/pagar`',
  ].join('\n');
}

function QR_MESSAGE(precio = PRICE_PRODUCT) {
  const monto = Number(precio).toFixed(2);

  return [
    '✏️ *Intrucciones de pago con QR*',
    '',
    '1️⃣ Toma captura o guarda el QR.',
    '2️⃣ Busca la opción *Escanear QR*.',
    '3️⃣ Selecciona *Subir imagen*.',
    `4️⃣ Realiza el pago de *S/ ${monto}*.`,
    '5️⃣ Envía el comprobante por este chat.',
    '',
    '⏳ Una vez verificado el pago, activaré la licencia con tu correo.',
  ].join('\n');
}

function getCommandResponse(normalizedText) {
  const texto = String(normalizedText || '').trim();
  const response = COMMAND_RESPONSES[texto] ?? null;

  if (typeof response === 'function') {
    return response();
  }

  return response;
}

function getPaymentInfoMessage(nombre, monto) {
  return ['💳 *Información de pago*', '', `👤 Usuario: *${nombre}*`, `💰 Monto a pagar: *S/${monto}*`].join('\n');
}

function getPaymentYapeMessage() {
  return ['💳 Métodos de pago: *Yape/Plin*', `👤 Titular: *Lguss*`].join('\n');
}

function getRegisterCodeMessage(code) {
  return [
    '🔐 *Código de verificación*',
    'Utiliza el siguiente código para completar tu registro:',
    '',
    `*${code}*`,
  ].join('\n');
}

function getTokenMessage(days) {
  return `🎉 *AUTOCOMPLETADO POR ${days} DÍA${days > 1 ? 'S' : ''}*

Para empezar a usarlo:

✅ 1. Copia el token.
✅ 2. Ve a *Configuración*.
✅ 3. Pégalo y pulsa *"Activar"*.

🚀 *Este es tu token:* 👇👇👇`;
}

function SERVICE_MESSAGE(text, normalizedText) {
  const mensajeOriginal = String(text || '').trim();

  const msg = normalizedText.toLowerCase().trim();
  if (!msg.startsWith('hola lguss') || !msg.includes('quisiera solicitar')) {
    return null;
  }

  const lineas = mensajeOriginal
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);

  const servicioSolicitado = lineas.find((linea) => /\(S\/\s*\d+(\.\d{1,2})?\)/i.test(linea));

  if (!servicioSolicitado) {
    return null;
  }

  let categoriaEspecial = null;

  if (
    normalizedText.includes('tiktok') ||
    normalizedText.includes('instagram') ||
    normalizedText.includes('facebook') ||
    normalizedText.includes('whatsapp') ||
    normalizedText.includes('telegram')
  ) {
    categoriaEspecial = 'red';
  }

  if (normalizedText.includes('doxeo')) {
    categoriaEspecial = 'doxing';
  }

  const mensaje = [
    '💳 *Servicio solicitado*',
    '',
    `${servicioSolicitado}`,
    '',
    'Realiza el pago por medio de este QR.',
    'Luego envíame el comprobante para comenzar con tu pedido.',
  ];

  if (categoriaEspecial === 'red') {
    mensaje.push(
      '',
      '⚠️ *Importante*',
      '• Tiempo de entrega: *5 a 30 minutos*.',
      '• Debes enviarme el link del perfil o publicación.',
      '• El perfil debe estar *público*.',
    );
  }

  if (categoriaEspecial === 'doxing') {
    mensaje.push(
      '',
      '⚠️ *Importante*',
      '• Puedes buscar por *DNI* o *nombres completos*.',
      '• También puedes buscar por *número de teléfono*.',
    );
  }

  return {
    image: 'qr.png',
    text: mensaje.join('\n'),
  };
}

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[1-9]️⃣/g, (match) => match[0])
    .trim();
}

module.exports = {
  COMMAND_RESPONSES,
  QR_MESSAGE,
  SERVICE_MESSAGE,
  getCommandResponse,
  getPaymentInfoMessage,
  getRegisterCodeMessage,
  getTokenMessage,
  normalizeText,
};
