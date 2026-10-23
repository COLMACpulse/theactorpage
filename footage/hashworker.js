/* CHECK THE COPY: reads one file at a time, in slices, and gives back its SHA-256. Runs off the page so the page
   stays responsive; one of these per drive, so the card and its copies are read at the same time. */
importScripts('../shared/vendor/sha256.min.js');
const SLICE = 16 * 1024 * 1024;
let H = null;
self.onmessage = async e => {
  const { id, file } = e.data;
  try {
    if (!H) H = await hashwasm.createSHA256();
    H.init(); let at = 0, last = 0;
    while (at < file.size) {
      const buf = new Uint8Array(await file.slice(at, Math.min(file.size, at + SLICE)).arrayBuffer());
      H.update(buf); at += buf.length;
      if (at - last >= 64 * 1024 * 1024 || at === file.size) { self.postMessage({ id, read: at }); last = at; }
      if (!buf.length) break;
    }
    self.postMessage({ id, done: true, hex: H.digest('hex'), read: file.size });
  } catch (err) { self.postMessage({ id, done: true, error: String(err && err.name || err) }); }
};
