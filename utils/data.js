const FILE_APK = 'files/Yape_Fake.apk';
const TITLE_PRODUCT = 'Yape Fake';
const PRICE_PRODUCT = 50;

const MAIN_MENU_MESSAGE = [
  '📋 *Menú principal*',
  '```',
  '🔰 GENERAL',
  '──────────────┼─────────────────',
  '/info         │ Yape Fake',
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
  '/android       │ Instalación',
  '/iphone        │ Instalación',
  '```',
].join('\n');

const MSG_HELP_1 = 'hola ayuda con el yape fake!';
const MSG_HELP_2 = 'hola, ayuda con el yape fake!';
const MSG_HELP_3 = 'hola ayuda con la instalacion del yape fake!';

module.exports = {
  TITLE_PRODUCT,
  PRICE_PRODUCT,
  FILE_APK,
  MAIN_MENU_MESSAGE,
  TUTORIALES_MESSAGE,
  MSG_HELP_1,
  MSG_HELP_2,
  MSG_HELP_3,
};
