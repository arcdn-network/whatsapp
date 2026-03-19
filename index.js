require('dotenv').config({ quiet: true });
const express = require('express');
const { startWhatsAppBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3060;

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'whatsapp-bot',
    status: 'online',
  });
});

async function bootstrap() {
  try {
    app.listen(PORT, () => {
      console.log(`[SERVER] Servidor escuchando en puerto ${PORT}`);
    });

    await startWhatsAppBot();
    console.log('[WHATSAPP] Bot iniciado correctamente');
  } catch (error) {
    console.error('[APP] Error al iniciar:', error);
    process.exit(1);
  }
}

bootstrap();
