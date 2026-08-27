const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const { banUser, unbanUser, isBanned } = require('./services/banned');
const {
  buscarPagoPorOperacion,
  buscarCodigoRegistroPorEmail,
  crearTokenAutocompletado,
  consultaSearch,
} = require('./services/querys');
const { htmlToWhatsApp } = require('./utils/functions');
const {
  QR_MESSAGE,
  SERVICE_MESSAGE,
  getCommandResponse,
  getRegisterCodeMessage,
  getPaymentInfoMessage,
  getTokenMessage,
  normalizeText,
} = require('./utils/constants');

const resourcesPath = path.join(process.cwd(), 'resources');
const PAYMENT_MESSAGE_REGEX = /Mi código de pago es:\s*\*?(\d+)\*?/i;
const REGISTER_MESSAGE_REGEX = /hola,\s*no me llego el codigo de registro\.\s*mi correo es:\s*([^\s]+@[^\s]+)/i;
const TOKEN_COMMAND_REGEX = /^\/token(?:\s+(\d+))?$/i;
const C4_COMMAND_REGEX = /^\/(c4|c4a|c4f)\s+(\d{8})$/i;
const duplicateMessages = new Map();
const DUPLICATE_WINDOW_MS = 4000;

let clientInstance = null;
let clientInitializing = null;

function getMessageChatId(msg) {
  if (!msg) return '';
  return msg.fromMe ? msg.to || '' : msg.from || '';
}

function getQuotedMessageId(msg) {
  const id = msg?.id;
  if (!id) return undefined;
  return id._serialized || id['$1'] || `${id.fromMe}_${id.remote}_${id.id}`;
}

function isSlashCommand(text) {
  return /^\/\S+(?:\s+\S.*)?$|^\/$/.test(String(text || '').trim());
}

function shouldProcessMessage(msg) {
  const chatId = getMessageChatId(msg);
  if (!chatId) return false;
  if (chatId.includes('@g.us')) return false;
  if (chatId.includes('@newsletter')) return false;
  if (chatId.includes('@broadcast')) return false;

  if (msg.fromMe) {
    return isSlashCommand(msg.body);
  }

  return true;
}

function shouldBlockDuplicate(senderId, normalizedText) {
  if (!senderId || !normalizedText) return false;

  const now = Date.now();
  const last = duplicateMessages.get(senderId);

  if (last && last.text === normalizedText && now - last.at < DUPLICATE_WINDOW_MS) {
    return true;
  }

  duplicateMessages.set(senderId, {
    text: normalizedText,
    at: now,
  });

  return false;
}

function cleanupDuplicateMessages() {
  const now = Date.now();

  for (const [senderId, value] of duplicateMessages.entries()) {
    if (!value || now - value.at > DUPLICATE_WINDOW_MS * 3) {
      duplicateMessages.delete(senderId);
    }
  }
}

function normalizeResponse(response) {
  if (!response) return [];

  if (typeof response === 'string') {
    return [{ text: response, reply: false }];
  }

  if (Array.isArray(response)) {
    return response.map((item) => ({
      ...item,
      reply: item?.reply === true,
    }));
  }

  return [
    {
      ...response,
      reply: response?.reply === true,
    },
  ];
}

async function getSpecialQueryResponse(text) {
  const paymentMatch = text.match(PAYMENT_MESSAGE_REGEX);

  if (paymentMatch) {
    const cip = paymentMatch[1];
    const resp = await buscarPagoPorOperacion(cip);

    if (!resp.ok) {
      return {
        text: resp.message,
      };
    }

    const pago = resp.data;
    const email = pago.email || null;
    const precio = pago.amount ?? 50;

    const nombre = email ? String(email).split('@')[0] : '-';
    const monto = Number(precio).toFixed(2);

    return [
      {
        image: 'qr.png',
        text: getPaymentInfoMessage(nombre, monto),
      },
      {
        gif: 'videos/escanear_qr.mp4',
        text: QR_MESSAGE(monto),
      },
    ];
  }

  const normalizedOriginalText = normalizeText(text);
  const registerMatch = normalizedOriginalText.match(REGISTER_MESSAGE_REGEX);

  if (registerMatch) {
    const email = registerMatch[1].trim().toLowerCase();
    const resp = await buscarCodigoRegistroPorEmail(email);

    if (!resp.ok) {
      return {
        text: resp.message,
        reply: true,
      };
    }

    return {
      text: getRegisterCodeMessage(resp.data.code),
      reply: true,
    };
  }

  return null;
}

async function getResponseConfig(text, normalizedText) {
  const specialResponse = await getSpecialQueryResponse(text);
  if (specialResponse) {
    return specialResponse;
  }

  const serviceRequestResponse = SERVICE_MESSAGE(text, normalizedText);
  if (serviceRequestResponse) {
    return serviceRequestResponse;
  }

  const directResponse = getCommandResponse(normalizedText);
  if (directResponse) {
    return directResponse;
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTypingDelay(text) {
  const length = String(text || '').length;
  const base = 300;
  const perChar = 8;
  const jitter = Math.floor(Math.random() * 400);

  return Math.min(base + length * perChar + jitter, 1500);
}

async function simulateTyping(chat, text) {
  try {
    if (!chat) return;

    await chat.sendStateTyping();
    await sleep(getTypingDelay(text));
    await chat.clearState();
  } catch (error) {
    console.error('[WHATSAPP] Error simulando escritura:', error.message);
  }
}

function resolveResourcePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(resourcesPath, filePath);
}

const mediaCache = new Map();

function getCachedMedia(filePath) {
  if (mediaCache.has(filePath)) {
    return mediaCache.get(filePath);
  }

  const media = MessageMedia.fromFilePath(filePath);
  mediaCache.set(filePath, media);
  return media;
}

async function sendMediaMessage(client, chatId, mediaPath, options = {}, extraOptions = {}) {
  if (client !== clientInstance) return false;

  const filePath = resolveResourcePath(mediaPath);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const media = getCachedMedia(filePath);
    await client.sendMessage(chatId, media, { ...options, ...extraOptions });
    return true;
  } catch (error) {
    console.error('[WHATSAPP] Error enviando media, probablemente sesión caída:', error.message);
    return false;
  }
}

async function sendNormalizedResponse(client, originalMsg, response) {
  const messages = normalizeResponse(response);
  const chatId = getMessageChatId(originalMsg);
  const quotedMessageId = getQuotedMessageId(originalMsg);

  let chat = null;
  try {
    chat = await originalMsg.getChat();
  } catch (error) {
    console.error('[WHATSAPP] Error obteniendo chat:', error.message);
  }

  for (const msg of messages) {
    const text = typeof msg.text === 'string' ? msg.text.trim() : '';
    const reply = msg.reply === true;

    const options = {
      caption: text || undefined,
      quotedMessageId: reply ? quotedMessageId : undefined,
    };

    if (text && chat) {
      await simulateTyping(chat, text);
    }

    let mediaSent = false;

    const mediaList = [
      { value: msg.gif, extra: { sendVideoAsGif: true } },
      { value: msg.image, extra: undefined },
      { value: msg.video, extra: undefined },
      { value: msg.file, extra: { sendMediaAsDocument: true } },
    ];

    for (const media of mediaList) {
      const value = typeof media.value === 'string' ? media.value.trim() : '';

      if (value) {
        const sent = await sendMediaMessage(client, chatId, value, options, media.extra);

        if (sent) {
          mediaSent = true;
          break;
        }
      }
    }

    if (!mediaSent && text) {
      await client.sendMessage(chatId, text, { quotedMessageId: options.quotedMessageId });
    }
  }
}

async function onNewMessage(msg) {
  try {
    if (!clientInstance) return;
    if (!shouldProcessMessage(msg)) return;
    if (!msg.body) return;

    cleanupDuplicateMessages();

    const senderId = getMessageChatId(msg);
    if (!senderId) return;

    const normalizedText = normalizeText(msg.body);

    // ── Comandos admin ──
    if (msg.fromMe) {
      const myId = clientInstance.info?.wid?._serialized;

      if (normalizedText === '/off') {
        if (senderId === myId) return;
        banUser(senderId);
        return;
      }
      if (normalizedText === '/on') {
        if (senderId === myId) return;
        unbanUser(senderId);
        return;
      }

      const tokenMatch = normalizedText.match(TOKEN_COMMAND_REGEX);
      if (tokenMatch) {
        const days = tokenMatch[1] ? parseInt(tokenMatch[1], 10) : 7;
        const resp = await crearTokenAutocompletado(days);

        if (!resp.ok) {
          await clientInstance.sendMessage(senderId, resp.message);
          return;
        }

        await sendMediaMessage(clientInstance, senderId, 'auto.png', {
          caption: getTokenMessage(days),
        });

        await clientInstance.sendMessage(senderId, resp.data.token);
        return;
      }

      const c4Match = normalizedText.match(C4_COMMAND_REGEX);

      if (c4Match) {
        const tipo = c4Match[1].toLowerCase();
        const documento = c4Match[2];

        const resp = await consultaSearch(tipo, documento);

        if (!resp.success) {
          await clientInstance.sendMessage(senderId, resp.message);
          return;
        }

        if (resp.base64) {
          const media = new MessageMedia('application/pdf', resp.base64, resp.filename);
          await clientInstance.sendMessage(senderId, media, { sendMediaAsDocument: true });
        }

        await clientInstance.sendMessage(senderId, htmlToWhatsApp(resp.message));

        return;
      }
    }

    // ── Bloquear baneados ──
    if (!msg.fromMe && isBanned(senderId)) return;

    // ── Flujo normal ──
    if (shouldBlockDuplicate(senderId, normalizedText)) return;

    const response = await getResponseConfig(msg.body, normalizedText);
    if (!response) return;

    await sendNormalizedResponse(clientInstance, msg, response);
  } catch (error) {
    console.error('[WHATSAPP] Error en handler:', error);
  }
}

// ── Constantes de reconexión ──
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 8000;
let retryCount = 0;

function createWhatsAppClient() {
  const sessionPath = '.wwebjs_auth';
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  return new Client({
    authStrategy: new LocalAuth({
      clientId: 'main',
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
    authTimeoutMs: 120000,
    qrMaxRetries: 10,
  });
}

async function startWhatsAppBot() {
  if (clientInstance) return clientInstance;
  if (clientInitializing) return clientInitializing;

  clientInitializing = (async () => {
    const client = createWhatsAppClient();

    client.on('qr', (qr) => {
      console.log('[WHATSAPP] Escanea este QR:');
      qrcode.generate(qr, { small: true });
    });

    client.on('change_state', (state) => {
      console.log('[WHATSAPP] change_state:', state);
    });

    client.on('authenticated', () => {
      retryCount = 0;
      console.log('[WHATSAPP] Sesión autenticada');
    });

    client.on('ready', () => {
      retryCount = 0;
      const wid = client.info?.wid?._serialized || 'sin_wid';
      console.log(`[WHATSAPP] Conectado como: ${wid}`);
    });

    client.on('auth_failure', async (msg) => {
      console.error('[WHATSAPP] Falló la autenticación:', msg);

      try {
        await client.destroy();
      } catch (_) {}

      const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.warn('[WHATSAPP] Sesión eliminada, reiniciando...');
      }

      scheduleReconnect();
    });

    client.on('disconnected', async (reason) => {
      console.warn('[WHATSAPP] Cliente desconectado:', reason);
      clientInstance = null;
      clientInitializing = null;

      try {
        await client.destroy();
      } catch (_) {}

      if (reason === 'CONFLICT' || reason === 'UNLAUNCHED') {
        console.error('[WHATSAPP] Conflicto de sesión detectado, saliendo...');
        process.exit(1);
        return;
      }

      scheduleReconnect();
    });

    client.on('message', onNewMessage);
    client.on('message_create', onNewMessage);

    await client.initialize();

    clientInstance = client;
    clientInitializing = null;

    return clientInstance;
  })();

  try {
    return await clientInitializing;
  } catch (error) {
    clientInitializing = null;
    scheduleReconnect();
    throw error;
  }
}

function scheduleReconnect() {
  if (retryCount >= MAX_RETRIES) {
    console.error(`[WHATSAPP] Máximo de reintentos (${MAX_RETRIES}) alcanzado. Saliendo.`);
    process.exit(1);
    return;
  }

  retryCount++;
  const delay = RETRY_DELAY_MS * retryCount;
  console.log(`[WHATSAPP] Reconectando en ${delay / 1000}s... (intento ${retryCount}/${MAX_RETRIES})`);

  setTimeout(async () => {
    try {
      await startWhatsAppBot();
    } catch (error) {
      console.error('[WHATSAPP] Error al reconectar:', error.message);
    }
  }, delay);
}

module.exports = {
  startWhatsAppBot,
};
