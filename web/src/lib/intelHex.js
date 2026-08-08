// Minimal Intel HEX parser -- no Node Buffer dependency, safe for the browser.
// (The 'intel-hex' npm package depends on Node's Buffer and breaks in browsers --
// discovered and worked around during the simulation-core prototype.)
export function parseIntelHex(hexText) {
  const bytes = [];
  let extendedAddr = 0;
  for (const rawLine of hexText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith(':')) continue;
    const byteCount = parseInt(line.substr(1, 2), 16);
    const address = parseInt(line.substr(3, 4), 16);
    const recordType = parseInt(line.substr(7, 2), 16);
    if (recordType === 0) {
      const fullAddr = extendedAddr + address;
      for (let i = 0; i < byteCount; i++) {
        bytes[fullAddr + i] = parseInt(line.substr(9 + i * 2, 2), 16);
      }
    } else if (recordType === 4) {
      extendedAddr = parseInt(line.substr(9, 4), 16) << 16;
    }
  }
  const length = bytes.length + (bytes.length % 2);
  const data = new Uint8Array(length);
  for (let i = 0; i < length; i++) data[i] = bytes[i] || 0;
  return data;
}

export function hexToProgram(hexText) {
  const data = parseIntelHex(hexText);
  return new Uint16Array(data.buffer, data.byteOffset, data.length / 2);
}
