const SERVICES = [
  {
    id: '1',
    img: 'yape.png',
    option: 'Yape Fake',
    message: [
      '🚀 *YAPE FAKE - 2026*',
      '',
      'Activa tu licencia de forma segura aquí.',
      '💰 *Precio:* S/ 40',
      '',
      '✅ *Pago único*',
      '✅ *Acceso permanente*',
      '✅ *Actualizaciones automáticas*',
      '',
      'Si deseas adquirirlo, escribe: `/pagar`',
    ],
  },
  {
    id: '2',
    img: 'banks.png',
    option: 'Bancas Fake',
    message: [
      '🚀 *BANCAS FAKE*',
      '',
      'Activa el acceso a tus bancas.',
      'No necesitas reinstalar la app: el acceso es directamente desde tu mismo Yape.',
      '',
      '💰 *Precios:*',
      '• 1 App → S/ 15',
      '• 2 Apps → S/ 25',
      '• 3 Apps → S/ 30',
      '',
      '✅ *Pago único*',
      '✅ *Activación inmediata*',
      '✅ *Actualizaciones automáticas*',
      '',
      'Si deseas adquirirlo, escribe: `/pagar`',
    ],
  },
  {
    id: '3',
    img: 'vip.png',
    option: 'Contenido VIP',
    message: [
      '🔞 *GRUPO VIP CONTENIDO PREMIUM*',
      '',
      'Accede al grupo privado con contenido exclusivo.',
      'Encontrarás material de influencers, tiktokers peruanas, castings y contenido casero.',
      '',
      '💰 *Precio:* S/ 50',
      '',
      '✅ Pago único',
      '✅ Acceso permanente',
      '✅ Fotos y videos exclusivos',
      '✅ Contenido nuevo constantemente',
      '✅ Descarga todo el material',
      '',
      'Si deseas adquirirlo ,escribe: `/pagar`',
    ],
  },
  {
    id: '4',
    img: 'followers.png',
    option: 'Seguidores',
    message: [
      '🚀 *SEGUIDORES PARA REDES SOCIALES*',
      '',
      '💯 Impulsa tu perfil y aumenta tu alcance.',
      '',
      '✅ *Entrega inmediata*',
      '✅ *Tiempo de servicio:* 5 a 30 minutos',
      '✅ *Sin límite de cantidad*, tú decides',
      '',
      'Si deseas solicitar un pedido',
      'escribe: `/pagar`',
    ],
  },
  {
    id: '5',
    img: 'doxing.png',
    option: 'Doxeos',
    message: [
      '🔎 *SERVICIOS DE DOXEOS*',
      '',
      'Realiza búsquedas mediante:',
      '',
      '✅ *DNI o nombres completos*',
      '✅ *Número de celular*',
      '✅ *Placa vehicular*',
      '',
      'Si deseas solicitar una consulta',
      'escribe: `/pagar`',
    ],
  },
];

const MAIN_MENU_MESSAGE = [
  '📋 *Menú principal*',
  '```',
  '🔰 GENERAL',
  '──────────────┼─────────────────',
  '/info         │ Yape Fake',
  '/servicios    │ Ver servicios',
  '/apk          │ Descargar APK',
  '',
  '💰 PAGOS',
  '──────────────┼─────────────────',
  '/pagar        │ Instrucciones',
  '/qr           │ Ver QR de pago',
  '',
  '🆘 AYUDA',
  '──────────────┼─────────────────',
  '/activacion   │ Ya pagué',
  '/tutorial     │ Tutoriales',
  '/estafas      │ Me estafaron',
  '/soporte      │ Reportar errores',
  '```',
].join('\n');

const TUTORIALES_MESSAGE = [
  '🎓 *Tutoriales disponibles*',
  '```',
  '───────────────┼─────────────────',
  '/escanear      │ Escanear QR',
  '/autocompletar │ Autocompletado',
  '```',
].join('\n');

const serviceRows = SERVICES.map((service) => `${service.id}️⃣ ${service.option}`);
const INFO_MESSAGE = ['📋 *Servicios disponibles*', '', ...serviceRows, '', '✍️ Escribe un *número*'].join('\n');

const YAPE_APP_MESSAGE = SERVICES[0].message.join('\n');

function QR_MESSAGE(precio = 40) {
  const monto = Number(precio).toFixed(2);

  return [
    '✏️ *Intrucciones de pago con QR*',
    '',
    'Sigue estos pasos para pagar:',
    '',
    '1️⃣ Abre tu *Yape* o banca móvil.',
    '2️⃣ Selecciona *Escanear QR*.',
    '3️⃣ Ve a la opción *Subir imagen*.',
    `4️⃣ Realiza el pago de *S/ ${monto}*.`,
    '5️⃣ Envía el *comprobante de pago* por este chat.',
    '',
    '⏳ Una vez verificado el pago, activaré la licencia con tu correo.',
  ].join('\n');
}

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
  'hola, ayuda con el yape fake!': {
    text: 'Hola, en que puedo ayudarte?',
  },
  'hola informacion sobre el yape.': {
    image: 'yape.png',
    text: YAPE_APP_MESSAGE,
  },
  '/menu': {
    text: MAIN_MENU_MESSAGE,
  },
  '/info': {
    image: 'yape.png',
    text: YAPE_APP_MESSAGE,
  },
  '/servicios': {
    text: INFO_MESSAGE,
  },
  '/pagar': () => ({
    image: 'qr.png',
    text: QR_MESSAGE(40),
  }),
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
      file: 'files/Yape_Fake.apk',
      text: null,
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

function getRegisterCodeMessage(code) {
  return [
    '🔐 *Código de verificación*',
    'Utiliza el siguiente código para completar tu registro:',
    '',
    `*${code}*`,
  ].join('\n');
}

function getServiceResponseById(id) {
  const value = String(id || '').trim();
  if (!/^[1-5]$/.test(value)) return null;

  const service = SERVICES.find((item) => item.id === value);
  if (!service) return null;

  return {
    text: Array.isArray(service.message) ? service.message.join('\n') : '',
    image: service.img || '',
  };
}

function SERVICE_MESSAGE(text, normalizedText) {
  const mensajeOriginal = String(text || '').trim();

  if (!normalizedText.includes('quisiera solicitar los siguientes servicios')) {
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

function getCommandKey(normalizedText) {
  const text = String(normalizedText || '').trim();

  if (COMMAND_RESPONSES[text]) {
    return text;
  }

  if (/^[1-5]$/.test(text)) {
    return text;
  }

  return null;
}

module.exports = {
  SERVICES,
  COMMAND_RESPONSES,
  QR_MESSAGE,
  SERVICE_MESSAGE,
  getCommandResponse,
  getCommandKey,
  getServiceResponseById,
  getPaymentInfoMessage,
  getRegisterCodeMessage,
  normalizeText,
};
