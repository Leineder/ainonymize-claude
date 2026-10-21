import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');

// ../extension/core/byte-search.js
function valueEncodings(value) {
  const out = [new TextEncoder().encode(value)];
  const latin = new Uint8Array(value.length);
  let latinOk = true;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 255) {
      latinOk = false;
      break;
    }
    latin[i] = code;
  }
  if (latinOk) out.push(latin);
  const be = new Uint8Array(value.length * 2);
  const le = new Uint8Array(value.length * 2);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    be[i * 2] = code >> 8;
    be[i * 2 + 1] = code & 255;
    le[i * 2] = code & 255;
    le[i * 2 + 1] = code >> 8;
  }
  out.push(be, le);
  return out;
}
function binaryString(bytes) {
  const CHUNK = 32768;
  const parts = [];
  for (let i = 0; i < bytes.length; i += CHUNK) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
  return parts.join("");
}
function findLiteralValues(bytes, values) {
  const hits = /* @__PURE__ */ new Set();
  const worth = [...new Set(values)].filter((v) => v && v.length >= 6 && new RegExp("\\p{L}", "u").test(v));
  if (!worth.length || !bytes || !bytes.length) return hits;
  const hay = binaryString(bytes);
  const hasNul = hay.indexOf("\0") >= 0;
  for (const value of worth) {
    const seen = /* @__PURE__ */ new Set();
    for (const needle of valueEncodings(value)) {
      const key = binaryString(needle);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!hasNul && key.indexOf("\0") >= 0) continue;
      if (hay.indexOf(key) >= 0) {
        hits.add(value);
        break;
      }
    }
  }
  return hits;
}

export {
  findLiteralValues
};
