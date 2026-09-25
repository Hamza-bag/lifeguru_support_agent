const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = path.join(__dirname, '..', '..', 'logs');
const DEFAULT_FILE = path.join(DEFAULT_DIR, 'chats.jsonl');

function ensureLogFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  return filePath;
}

function createChatLogger({ enabled, filePath = DEFAULT_FILE } = {}) {
  const dest = enabled ? ensureLogFile(filePath) : null;

  function write(entry) {
    const row = { ts: new Date().toISOString(), ...entry };
    if (enabled) {
      console.log('\n---------- support chat ----------');
      console.log(JSON.stringify(row, null, 2));
      console.log('----------------------------------\n');
    }
    if (dest) {
      fs.appendFileSync(dest, `${JSON.stringify(row)}\n`);
    }
    return row;
  }

  function readLast(limit = 50) {
    if (!dest || !fs.existsSync(dest)) return [];
    const lines = fs.readFileSync(dest, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
  }

  return { write, readLast, filePath: dest };
}

module.exports = { createChatLogger, DEFAULT_FILE };
