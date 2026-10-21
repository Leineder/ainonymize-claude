import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');

// ../extension/core/eml.js
var EmlFormatError = class extends Error {
  constructor(reason) {
    super(reason);
    this.name = "EmlFormatError";
    this.reason = reason;
  }
};
var KEEP_HEADERS = ["From", "To", "Cc", "Reply-To", "Subject", "Date"];
var latin1 = (bytes) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");
function decodeBytes(bytes, charset) {
  const cs = String(charset || "utf-8").trim().toLowerCase().replace(/^"|"$/g, "");
  const label = cs === "latin1" || cs === "iso8859-1" ? "iso-8859-1" : cs;
  try {
    return new TextDecoder(label, { fatal: false }).decode(bytes);
  } catch (e) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}
function qpToBytes(text) {
  const soft = text.replace(/=\r?\n/g, "");
  const out = [];
  for (let i = 0; i < soft.length; i++) {
    const c = soft[i];
    if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(soft.slice(i + 1, i + 3))) {
      out.push(parseInt(soft.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const code = c.charCodeAt(0);
      if (code < 256) out.push(code);
      else for (const b of new TextEncoder().encode(c)) out.push(b);
    }
  }
  return new Uint8Array(out);
}
function b64ToBytes(text) {
  const clean = text.replace(/[^A-Za-z0-9+/=]/g, "");
  try {
    const bin = atob(clean);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch (e) {
    return new Uint8Array(0);
  }
}
function decodeHeaderValue(value) {
  return String(value || "").replace(/(=\?[^?]+\?[QqBb]\?[^?]*\?=)\s+(?==\?)/g, "$1").replace(/=\?([^?]+)\?([QqBb])\?([^?]*)\?=/g, (_, cs, enc, data) => {
    const bytes = enc.toUpperCase() === "B" ? b64ToBytes(data) : qpToBytes(data.replace(/_/g, " "));
    return decodeBytes(bytes, cs);
  });
}
function splitHead(raw) {
  const m = /\r?\n\r?\n/.exec(raw);
  if (!m) return { head: raw, body: "" };
  return { head: raw.slice(0, m.index), body: raw.slice(m.index + m[0].length) };
}
function parseHeaders(head) {
  const unfolded = head.replace(/\r?\n[ \t]+/g, " ");
  const list = [];
  for (const line of unfolded.split(/\r?\n/)) {
    const m = /^([!-9;-~]+):[ \t]*(.*)$/.exec(line);
    if (m) list.push([m[1], m[2]]);
  }
  return list;
}
var headerOf = (list, name) => {
  const h = list.find(([k]) => k.toLowerCase() === name.toLowerCase());
  return h ? h[1] : "";
};
function param(value, name) {
  const m = new RegExp(`(?:^|;)\\s*${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, "i").exec(value || "");
  return m ? m[1] ?? m[2] : "";
}
function htmlToText(html) {
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function walk(raw, acc, depth = 0) {
  const { head, body } = splitHead(raw);
  const headers = parseHeaders(head);
  const ctype = headerOf(headers, "Content-Type") || "text/plain";
  const mediatype = ctype.split(";")[0].trim().toLowerCase();
  const disposition = headerOf(headers, "Content-Disposition").toLowerCase();
  if (mediatype.startsWith("multipart/") && depth < 8) {
    const boundary = param(ctype, "boundary");
    if (!boundary) return;
    const parts = body.split(new RegExp(`\\r?\\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?[ \\t]*\\r?\\n?`));
    for (const part of parts.slice(1)) if (part.trim()) walk(part, acc, depth + 1);
    return;
  }
  const isText = mediatype === "text/plain" || mediatype === "text/html";
  if (!isText || disposition.startsWith("attachment")) {
    acc.attachments++;
    return;
  }
  const enc = headerOf(headers, "Content-Transfer-Encoding").trim().toLowerCase();
  let bytes;
  if (enc === "quoted-printable") bytes = qpToBytes(body);
  else if (enc === "base64") bytes = b64ToBytes(body);
  else bytes = Uint8Array.from(body, (c) => c.charCodeAt(0) & 255);
  const text = decodeBytes(bytes, param(ctype, "charset") || "utf-8");
  (mediatype === "text/plain" ? acc.plain : acc.html).push(text);
}
function needsDecode(bytes) {
  const raw = latin1(bytes.subarray(0, Math.min(bytes.length, 262144)));
  const { head } = splitHead(raw);
  if (!/^(?:[!-9;-~]+:)/m.test(head)) return false;
  return /content-transfer-encoding:\s*(?:quoted-printable|base64)/i.test(raw) || /^content-type:\s*multipart\//im.test(raw) || /=\?[^?]+\?[QqBb]\?/.test(head);
}
function parse(bytes) {
  const raw = latin1(bytes);
  const { head } = splitHead(raw);
  const top = parseHeaders(head);
  if (!top.length) throw new EmlFormatError("eml_no_headers");
  const acc = { plain: [], html: [], attachments: 0 };
  walk(raw, acc);
  const body = (acc.plain.length ? acc.plain.join("\n\n") : acc.html.map(htmlToText).join("\n\n")).replace(/\r\n?/g, "\n");
  const headers = {};
  for (const key of KEEP_HEADERS) {
    const v = headerOf(top, key);
    if (v) headers[key] = decodeHeaderValue(v);
  }
  if (!body.trim() && !Object.keys(headers).length) throw new EmlFormatError("eml_no_content");
  headers["MIME-Version"] = "1.0";
  headers["Content-Type"] = "text/plain; charset=utf-8";
  headers["Content-Transfer-Encoding"] = "8bit";
  return { type: "mail", headers, body, droppedAttachments: acc.attachments };
}
function normalizeEntity(raw, depth = 0) {
  const m = /\r?\n\r?\n/.exec(raw);
  if (!m) return raw;
  const nl = m[0].startsWith("\r") ? "\r\n" : "\n";
  const head = raw.slice(0, m.index);
  const body = raw.slice(m.index + m[0].length);
  const headers = parseHeaders(head);
  const ctype = headerOf(headers, "Content-Type") || "text/plain";
  const mediatype = ctype.split(";")[0].trim().toLowerCase();
  const enc = headerOf(headers, "Content-Transfer-Encoding").trim().toLowerCase();
  const attach = headerOf(headers, "Content-Disposition").toLowerCase().startsWith("attachment");
  const lines = head.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/).map((l) => /=\?[^?]+\?[QqBb]\?/.test(l) ? decodeHeaderValue(l) : l);
  if (mediatype.startsWith("multipart/") && depth < 8) {
    const boundary = param(ctype, "boundary");
    if (boundary) {
      const esc = boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pieces = body.split(new RegExp(`(\\r?\\n?--${esc}(?:--)?[ \\t]*\\r?\\n?)`));
      const out = pieces.map((p, i) => i % 2 === 0 && i > 0 && p.trim() ? normalizeEntity(p, depth + 1) : p);
      return lines.join(nl) + nl + nl + out.join("");
    }
  }
  const isText = mediatype === "text/plain" || mediatype === "text/html";
  if (!isText || attach || !(enc === "quoted-printable" || enc === "base64")) {
    return lines.join(nl) + nl + nl + body;
  }
  const bytes = enc === "base64" ? b64ToBytes(body) : qpToBytes(body);
  const text = decodeBytes(bytes, param(ctype, "charset") || "utf-8");
  const fixed = lines.map((l) => {
    if (/^content-transfer-encoding:/i.test(l)) return "Content-Transfer-Encoding: 8bit";
    if (/^content-type:/i.test(l)) return l.replace(/(charset\s*=\s*)(?:"[^"]*"|[^;\s]+)/i, '$1"utf-8"');
    return l;
  });
  return fixed.join(nl) + nl + nl + text;
}
function normalizeForRestore(bytes) {
  const raw = latin1(bytes);
  if (!/^(?:[!-9;-~]+:)/m.test(splitHead(raw).head)) throw new EmlFormatError("eml_no_headers");
  return new TextEncoder().encode(normalizeEntity(raw));
}

export {
  EmlFormatError,
  needsDecode,
  parse,
  normalizeForRestore
};
