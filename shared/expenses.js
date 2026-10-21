/* THEACTORPAGE EXPENSES: what the work costs you, kept for tax time. Headshots, classes, dues, commission, the
   self-tape light, the parking at the callback, the miles you drove. One line each, a photo of the receipt if you
   have one, totals by year and kind, and one file for whoever does your taxes.
   A record, not tax advice: what counts depends on how you're paid (W-2 or 1099), your income and where you live.
   Miles: the IRS business rate for the year (2026: 72.5 cents a mile), yours to change.
   localStorage theactorpage_expenses_v1 (the lines), IndexedDB theactorpage_receipts (the photos).
   Money is kept in cents. Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const E = {}, KEY = 'theactorpage_expenses_v1';
  E.KEY = KEY;
  E.CATS = [['photos', 'Headshots and photos'], ['training', 'Classes and coaching'], ['gear', 'Self-tape and recording gear'], ['dues', 'Union dues'], ['commission', 'Agent and manager commission'],
    ['casting', 'Casting sites and subscriptions'], ['reel', 'Reel, editing and footage'], ['wardrobe', 'Wardrobe, hair and makeup for work'], ['travel', 'Travel: parking, transit, flights, hotels'], ['miles', 'Miles driven'],
    ['meals', 'Meals for work'], ['print', 'Printing and postage'], ['phone', 'Phone and internet, the work part'], ['research', 'Shows and screenings, for research'], ['services', 'Accountant, lawyer, other services'], ['other', 'Other']];
  E.RATES = { 2024: 67, 2025: 70, 2026: 72.5 };   // IRS standard business rate, cents a mile
  const now = () => Date.now(), uid = () => 'x' + now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const LS = () => { try { return g.localStorage; } catch (e) { return null; } };
  function read() { try { const d = JSON.parse((LS() && LS().getItem(KEY)) || 'null'); if (d && Array.isArray(d.items)) return Object.assign({ rates: {} }, d); } catch (e) { } return { items: [], rates: {} }; }
  function write(d) { try { LS().setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  /* "$1,234.50", "1234.5", "12" -> cents */
  E.cents = v => { const m = String(v == null ? '' : v).replace(/[$,\s]/g, '').match(/^-?\d*(?:\.\d{0,2})?/); const n = m && m[0] ? parseFloat(m[0]) : NaN; return isFinite(n) ? Math.round(n * 100) : 0; };
  E.money = c => { const n = (c || 0) / 100; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  E.rate = year => { const d = read(); const y = String(year); return d.rates[y] != null ? +d.rates[y] : (E.RATES[y] != null ? E.RATES[y] : E.RATES[Math.max.apply(null, Object.keys(E.RATES).map(Number))]); };
  E.setRate = (year, cents) => { const d = read(); d.rates[String(year)] = +cents; write(d); };
  E.milesCost = (miles, year) => Math.round((+miles || 0) * E.rate(year));
  E.all = () => read().items.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.at - a.at);
  E.get = id => read().items.find(x => x.id === id) || null;
  E.add = function (x) {
    const d = read(), date = /^\d{4}-\d\d-\d\d$/.test(x && x.date) ? x.date : new Date().toISOString().slice(0, 10), cat = (E.CATS.find(c => c[0] === (x && x.cat)) || ['other'])[0];
    const it = { id: uid(), at: now(), date, cat, what: clean(x.what), paidTo: clean(x.paidTo), note: clean(x.note), miles: cat === 'miles' ? +(x.miles || 0) : 0, receipt: x.receipt || '', amount: 0 };
    it.amount = cat === 'miles' ? E.milesCost(it.miles, date.slice(0, 4)) : E.cents(x.amount);
    if (!it.amount && cat !== 'miles') return null;
    d.items.push(it); write(d); return it;
  };
  E.set = function (id, patch) {
    const d = read(), it = d.items.find(x => x.id === id); if (!it) return null;
    ['date', 'cat', 'what', 'paidTo', 'note', 'receipt'].forEach(k => { if (patch[k] != null) it[k] = k === 'receipt' ? patch[k] : clean(patch[k]); });
    if (patch.miles != null) it.miles = +patch.miles || 0;
    if (it.cat === 'miles') it.amount = E.milesCost(it.miles, String(it.date).slice(0, 4)); else if (patch.amount != null) it.amount = E.cents(patch.amount);
    write(d); return it;
  };
  E.remove = function (id) { const d = read(); d.items = d.items.filter(x => x.id !== id); write(d); };
  E.catName = c => (E.CATS.find(x => x[0] === c) || ['', 'Other'])[1];
  E.years = () => { const y = {}; read().items.forEach(x => { y[String(x.date).slice(0, 4)] = 1; }); y[new Date().getFullYear()] = 1; return Object.keys(y).sort().reverse(); };
  E.ofYear = year => E.all().filter(x => String(x.date).slice(0, 4) === String(year));
  /* the year, by kind, biggest first. -> {total, miles, n, cats:[{cat, name, total, n}]} */
  E.summary = function (year) {
    const it = E.ofYear(year), by = {}; let total = 0, miles = 0;
    it.forEach(x => { const c = by[x.cat] = by[x.cat] || { cat: x.cat, name: E.catName(x.cat), total: 0, n: 0 }; c.total += x.amount; c.n++; total += x.amount; miles += x.miles || 0; });
    return { total, miles: Math.round(miles * 10) / 10, n: it.length, cats: Object.values(by).sort((a, b) => b.total - a.total) };
  };
  /* one file for your tax preparer */
  const q = s => { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  E.csv = function (year, receiptName) {
    const rows = [['Date', 'Kind', 'What', 'Paid to', 'Amount', 'Miles', 'Rate (cents a mile)', 'Receipt', 'Note']];
    E.ofYear(year).slice().reverse().forEach(x => rows.push([x.date, E.catName(x.cat), x.what, x.paidTo, (x.amount / 100).toFixed(2), x.miles || '', x.cat === 'miles' ? E.rate(String(x.date).slice(0, 4)) : '', x.receipt ? (receiptName ? receiptName(x) : 'yes') : '', x.note]));
    const s = E.summary(year); rows.push([]); rows.push(['Total ' + year, '', '', '', (s.total / 100).toFixed(2), s.miles || '', '', '', '']);
    s.cats.forEach(c => rows.push(['', c.name, c.n + ' item' + (c.n === 1 ? '' : 's'), '', (c.total / 100).toFixed(2), '', '', '', '']));
    return rows.map(r => r.map(q).join(',')).join('\r\n') + '\r\n';
  };
  E.receiptName = (x, ext) => x.date + '_' + (x.what || E.catName(x.cat)).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 40) + '_' + x.id.slice(-4) + '.' + (ext || 'jpg');
  /* receipts: a photo or a PDF, kept on this device */
  let dbp = null;
  function db() { if (dbp) return dbp; dbp = new Promise(res => { try { const r = indexedDB.open('theactorpage_receipts', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); return dbp; }
  const op = async (mode, fn) => { const d = await db(); if (!d) return null; return new Promise(res => { try { const t = d.transaction('files', mode), r = fn(t.objectStore('files')); t.oncomplete = () => res(r && r.result !== undefined ? r.result : true); t.onerror = () => res(null); } catch (e) { res(null); } }); };
  E.putReceipt = async (id, blob) => { const ok = await op('readwrite', st => st.put(blob, id)); if (ok) E.set(id, { receipt: blob.type || 'file' }); return !!ok; };
  E.receipt = id => op('readonly', st => st.get(id));
  E.dropReceipt = async id => { await op('readwrite', st => st.delete(id)); E.set(id, { receipt: '' }); };
  g.Expenses = E;
  if (typeof module !== 'undefined') module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
