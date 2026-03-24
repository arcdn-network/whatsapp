const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const { buscarPagoPorOperacion, buscarCodigoRegistroPorEmail } = require('./services/querys');
const {
  QR_MESSAGE,
  SERVICE_MESSAGE,
  getCommandResponse,
  getCommandKey,
  getServiceResponseById,
  getPaymentInfoMessage,
  getRegisterCodeMessage,
  normalizeText,
} = require('./utils/constants');

const resourcesPath = path.join(process.cwd(), 'resources');
const PAYMENT_MESSAGE_REGEX = /Mi código de pago es:\s*\*?(\d+)\*?/i;
const REGISTER_MESSAGE_REGEX = /hola,\s*no me llego el codigo de registro\.\s*mi correo es:\s*([^\s]+@[^\s]+)/i;
const duplicateMessages = new Map();
const DUPLICATE_WINDOW_MS = 4000;

let clientInstance = null;
let clientInitializing = null;

function getMessageChatId(msg) {
  if (!msg) return '';
  return msg.fromMe ? msg.to || '' : msg.from || '';
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
    const precio = pago.amount ?? 40;

    const nombre = email ? String(email).split('@')[0] : '-';
    const monto = Number(precio).toFixed(2);

    return [
      {
        image: 'qr.png',
        text: getPaymentInfoMessage(nombre, monto),
      },
      {
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
  const command = getCommandKey(normalizedText);

  const specialResponse = await getSpecialQueryResponse(text);
  if (specialResponse) {
    return specialResponse;
  }

  const serviceResponse = getServiceResponseById(command);
  if (serviceResponse) {
    return serviceResponse;
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

async function simulateTyping(client, chatId, text) {
  try {
    const chat = await client.getChatById(chatId);
    if (!chat) return;

    await chat.sendStateTyping();
    await sleep(getTypingDelay(text));
    await chat.clearState();
  } catch (error) {
    console.error('[WHATSAPP] Error simulando escritura:', error);
  }
}

function resolveResourcePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(resourcesPath, filePath);
}

async function sendMediaMessage(client, chatId, mediaPath, options = {}, extraOptions = {}) {
  const filePath = resolveResourcePath(mediaPath);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const media = MessageMedia.fromFilePath(filePath);
  await client.sendMessage(chatId, media, {
    ...options,
    ...extraOptions,
  });

  return true;
}

async function sendNormalizedResponse(client, originalMsg, response) {
  const messages = normalizeResponse(response);
  const chatId = getMessageChatId(originalMsg);
  const quotedMessageId = originalMsg.id?._serialized;

  for (const msg of messages) {
    const text = typeof msg.text === 'string' ? msg.text.trim() : '';
    const reply = msg.reply === true;

    const options = {
      caption: text || undefined,
      quotedMessageId: reply ? quotedMessageId : undefined,
    };

    if (text) {
      await simulateTyping(client, chatId, text);
    }

    let mediaSent = false;

    const mediaList = [
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

    if (shouldBlockDuplicate(senderId, normalizedText)) {
      return;
    }

    const response = await getResponseConfig(msg.body, normalizedText);
    if (!response) return;

    await sendNormalizedResponse(clientInstance, msg, response);
  } catch (error) {
    console.error('[WHATSAPP] Error en handler:', error);
  }
}

function createWhatsAppClient() {
  const sessionPath = '.wwebjs_auth';
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  return new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
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
      console.log('[WHATSAPP] Sesión autenticada');
    });

    client.on('ready', () => {
      const wid = client.info?.wid?._serialized || 'sin_wid';
      console.log(`[WHATSAPP] Conectado como: ${wid}`);
    });

    client.on('auth_failure', (msg) => {
      console.error('[WHATSAPP] Falló la autenticación:', msg);
    });

    client.on('disconnected', (reason) => {
      console.warn('[WHATSAPP] Cliente desconectado:', reason);
      clientInstance = null;
      clientInitializing = null;
      setTimeout(() => {
        process.exit(1);
      }, 3000);
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
    throw error;
  }
}

module.exports = {
  startWhatsAppBot,
};
