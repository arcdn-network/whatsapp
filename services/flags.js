const fs = require('fs');
const path = require('path');

const FLAGS_FILE = path.join(process.cwd(), 'data', 'flags.json');

function ensureFile() {
  const dir = path.dirname(FLAGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FLAGS_FILE)) fs.writeFileSync(FLAGS_FILE, JSON.stringify({}));
}

function readFlags() {
  ensureFile();
  return JSON.parse(fs.readFileSync(FLAGS_FILE, 'utf8'));
}

function setFlag(name, enabled) {
  const flags = readFlags();
  flags[name] = {
    enabled,
    since: enabled ? Math.floor(Date.now() / 1000) : flags[name]?.since || 0,
  };
  fs.writeFileSync(FLAGS_FILE, JSON.stringify(flags, null, 2));
}

function isEnabled(name, msgTimestamp) {
  const flag = readFlags()[name];
  if (!flag) return true; // por defecto activo
  if (!flag.enabled) return false;

  const ts = Number(msgTimestamp);
  if (ts && ts < flag.since) return false; // ignora mensajes anteriores a la activación

  return true;
}

module.exports = { setFlag, isEnabled };
