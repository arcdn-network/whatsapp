const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const { banUser, unbanUser, isBanned } = require('./services/banned');
const { setFlag, isEnabled } = require('./services/flags');
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
const SESSION_PATH = path.join(process.cwd(), '.wwebjs_auth');
const PAYMENT_MESSAGE_REGEX = /Mi código de pago es:\s*\*?(\d+)\*?/i;
const REGISTER_MESSAGE_REGEX = /hola,\s*no me llego el codigo de registro\.\s*mi correo es:\s*([^\s]+@[^\s]+)/i;
const TOKEN_COMMAND_REGEX = /^\/token(?:\s+(\d+))?$/i;
const C4_COMMAND_REGEX = /^\/(c4|c4a|c4f)\s+(\d{8})$/i;

// Anti-spam de texto repetido (solo mensajes entrantes)
const duplicateMessages = new Map();
const DUPLICATE_WINDOW_MS = 4000;

//Dedupe por ID de mensaje: 'message' y 'message_create' disparan el mismo mensaje
const processedMessages = new Map();
const PROCESSED_TTL_MS = 60000;

// Estado del cliente
let clientInstance = null; // cliente listo para usarse
let clientInitializing = null; // promesa de inicialización en curso
let currentClient = null; // último cliente creado (para ignorar eventos de clientes viejos)

function getMessageChatId(msg) {
  if (!msg) return '';
  return msg.fromMe ? msg.to || '' : msg.from || '';
}

function getQuotedMessageId(msg) {
  const id = msg?.id;
  if (!id) return undefined;
  return id._serialized || id['$1'] || `${id.fromMe}_${id.remote}_${id.id}`;
}

const MAX_MESSAGE_AGE_S = 60;
function isStaleMessage(msg) {
  const ts = Number(msg?.timestamp);
  if (!ts) return false;
  return Math.floor(Date.now() / 1000) - ts > MAX_MESSAGE_AGE_S;
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

function isAlreadyProcessed(msg) {
  const id = getQuotedMessageId(msg);
  if (!id) return false;

  const now = Date.now();

  if (processedMessages.has(id)) {
    return true;
  }

  processedMessages.set(id, now);
  return false;
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

  for (const [id, at] of processedMessages.entries()) {
    if (now - at > PROCESSED_TTL_MS) {
      processedMessages.delete(id);
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

async function getResponseConfig(text, normalizedText, isFromMe) {
  const specialResponse = await getSpecialQueryResponse(text);
  if (specialResponse) {
    return specialResponse;
  }

  const serviceRequestResponse = SERVICE_MESSAGE(text, normalizedText);
  if (serviceRequestResponse) {
    return serviceRequestResponse;
  }

  // Se pasa isFromMe para evaluar el flag de seguridad
  const directResponse = getCommandResponse(normalizedText, isFromMe);
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
  const stat = fs.statSync(filePath);
  const cached = mediaCache.get(filePath);

  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.media;
  }

  const media = MessageMedia.fromFilePath(filePath);
  mediaCache.set(filePath, { media, mtimeMs: stat.mtimeMs, size: stat.size });
  return media;
}

async function sendMediaMessage(client, chatId, mediaPath, options = {}, extraOptions = {}) {
  if (client !== clientInstance) return false;

  const filePath = resolveResourcePath(mediaPath);

  if (!fs.existsSync(filePath)) {
    console.error('[WHATSAPP] Archivo no encontrado:', filePath);
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
    const fallback = typeof msg.fallback === 'string' ? msg.fallback.trim() : '';
    const reply = msg.reply === true;

    const options = {
      caption: text || undefined,
      quotedMessageId: reply ? quotedMessageId : undefined,
    };

    if (text && chat) {
      await simulateTyping(chat, text);
    }

    let mediaSent = false;
    let mediaRequested = false;

    const mediaList = [
      { value: msg.gif, extra: { sendVideoAsGif: true } },
      { value: msg.image, extra: undefined },
      { value: msg.video, extra: undefined },
      { value: msg.file, extra: { sendMediaAsDocument: true } },
    ];

    for (const media of mediaList) {
      const value = typeof media.value === 'string' ? media.value.trim() : '';

      if (value) {
        mediaRequested = true;
        const sent = await sendMediaMessage(client, chatId, value, options, media.extra);

        if (sent) {
          mediaSent = true;
          break;
        }
      }
    }

    if (mediaSent) continue;

    if (text) {
      await client.sendMessage(chatId, text, { quotedMessageId: options.quotedMessageId });
      continue;
    }

    if (mediaRequested) {
      console.error(`[WHATSAPP] No se pudo enviar el archivo solicitado en el chat ${chatId}`);
      if (fallback) {
        await client.sendMessage(chatId, fallback, { quotedMessageId: options.quotedMessageId });
      }
    }
  }
}

async function onNewMessage(client, msg) {
  try {
    if (!client) return;
    if (clientInstance && client !== clientInstance) return;
    if (!shouldProcessMessage(msg)) return;
    if (isStaleMessage(msg)) return;
    if (!msg.body) return;

    if (isAlreadyProcessed(msg)) return;

    cleanupDuplicateMessages();

    const senderId = getMessageChatId(msg);
    if (!senderId) return;

    const normalizedText = normalizeText(msg.body);

    if (msg.fromMe) {
      const myId = client.info?.wid?._serialized;

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

      const registroMatch = normalizedText.match(REGISTRO_TOGGLE_REGEX);
      if (registroMatch) {
        const enabled = registroMatch[1].toLowerCase() === 'on';
        setFlag('register', enabled);
        console.log(`[WHATSAPP] Respuesta de código de registro: ${enabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
        if (myId) {
          await client.sendMessage(myId, `Código de registro: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
        }
        return;
      }

      const tokenMatch = normalizedText.match(TOKEN_COMMAND_REGEX);
      if (tokenMatch) {
        const days = tokenMatch[1] ? parseInt(tokenMatch[1], 10) : 7;
        const resp = await crearTokenAutocompletado(days);

        if (!resp.ok) {
          await client.sendMessage(senderId, resp.message);
          return;
        }

        await sendMediaMessage(client, senderId, 'auto.png', {
          caption: getTokenMessage(days),
        });

        await client.sendMessage(senderId, resp.data.token);
        return;
      }

      const c4Match = normalizedText.match(C4_COMMAND_REGEX);

      if (c4Match) {
        const tipo = c4Match[1].toLowerCase();
        const documento = c4Match[2];

        const resp = await consultaSearch(tipo, documento);

        if (!resp.success) {
          await client.sendMessage(senderId, resp.message);
          return;
        }

        if (resp.base64) {
          const media = new MessageMedia('application/pdf', resp.base64, resp.filename);
          await client.sendMessage(senderId, media, { sendMediaAsDocument: true });
        }

        await client.sendMessage(senderId, htmlToWhatsApp(resp.message));

        return;
      }
    }

    // ── Bloquear baneados ──
    if (!msg.fromMe && isBanned(senderId)) return;

    // ── Respuesta de código de registro desactivada (temporal) ──
    if (REGISTER_MESSAGE_REGEX.test(normalizedText) && !isEnabled('register', msg.timestamp)) return;

    // ── Anti-spam de texto repetido: solo para mensajes entrantes ──
    if (!msg.fromMe && shouldBlockDuplicate(senderId, normalizedText)) return;

    const response = await getResponseConfig(msg.body, normalizedText, msg.fromMe);
    if (!response) return;

    await sendNormalizedResponse(client, msg, response);
  } catch (error) {
    console.error('[WHATSAPP] Error en handler:', error);
  }
}

// ── Constantes de reconexión ──
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 8000;
let retryCount = 0;
let reconnectTimer = null;

function createWhatsAppClient() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
  }

  return new Client({
    authStrategy: new LocalAuth({
      clientId: 'main',
      dataPath: SESSION_PATH,
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

async function safeDestroy(client) {
  if (!client) return;

  try {
    await client.destroy();
  } catch (_) {}
}

function resetState(client) {
  if (currentClient !== client) return;

  currentClient = null;
  clientInstance = null;
  clientInitializing = null;
}

async function startWhatsAppBot() {
  if (clientInstance) return clientInstance;
  if (clientInitializing) return clientInitializing;

  clientInitializing = (async () => {
    const client = createWhatsAppClient();
    currentClient = client;

    try {
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

        if (currentClient === client) {
          clientInstance = client;
        }

        const wid = client.info?.wid?._serialized || 'sin_wid';
        console.log(`[WHATSAPP] Conectado como: ${wid}`);
      });

      client.on('auth_failure', async (msg) => {
        console.error('[WHATSAPP] Falló la autenticación:', msg);

        if (currentClient !== client) {
          await safeDestroy(client);
          return;
        }

        resetState(client);
        await safeDestroy(client);

        if (fs.existsSync(SESSION_PATH)) {
          fs.rmSync(SESSION_PATH, { recursive: true, force: true });
          console.warn('[WHATSAPP] Sesión eliminada, reiniciando...');
        }

        scheduleReconnect();
      });

      client.on('disconnected', async (reason) => {
        console.warn('[WHATSAPP] Cliente desconectado:', reason);

        if (currentClient !== client) {
          await safeDestroy(client);
          return;
        }

        resetState(client);
        await safeDestroy(client);

        if (reason === 'CONFLICT' || reason === 'UNLAUNCHED') {
          console.error('[WHATSAPP] Conflicto de sesión detectado, saliendo...');
          process.exit(1);
          return;
        }

        scheduleReconnect();
      });

      client.on('message', (msg) => onNewMessage(client, msg));
      client.on('message_create', (msg) => onNewMessage(client, msg));

      await client.initialize();

      if (currentClient !== client) {
        throw new Error('Cliente descartado durante la inicialización');
      }
    } catch (error) {
      resetState(client);
      await safeDestroy(client);
      throw error;
    }

    clientInstance = client;
    clientInitializing = null;

    return clientInstance;
  })();

  try {
    return await clientInitializing;
  } catch (error) {
    scheduleReconnect();
    throw error;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  if (retryCount >= MAX_RETRIES) {
    console.error(`[WHATSAPP] Máximo de reintentos (${MAX_RETRIES}) alcanzado. Saliendo.`);
    process.exit(1);
    return;
  }

  retryCount++;
  const delay = RETRY_DELAY_MS * retryCount;
  console.log(`[WHATSAPP] Reconectando en ${delay / 1000}s... (intento ${retryCount}/${MAX_RETRIES})`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

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
