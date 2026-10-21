import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');

// ../extension/core/models.js
var PiiSpan = class {
  constructor(start, end, category, text, score = 1, source = "ner") {
    this.start = start;
    this.end = end;
    this.category = category;
    this.text = text;
    this.score = score;
    this.source = source;
    this.accepted = true;
    this.tier = "auto";
  }
  overlaps(other) {
    return this.start < other.end && other.start < this.end;
  }
};
var MappingEntry = class {
  constructor(placeholder, value, category, surrogate = "") {
    this.placeholder = placeholder;
    this.value = value;
    this.category = category;
    this.surrogate = surrogate;
  }
};

export {
  PiiSpan,
  MappingEntry
};
