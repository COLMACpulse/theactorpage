/* EXPENSES page: add one (or miles), the year's lines by month, totals by kind, one file for your tax preparer. */
(function () {
  'use strict';
  const E = window.Expenses, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { year: String(new Date().getFullYear()), cat: 'photos', open: '', msg: '' };
  const today = () => new Date().toISOString().slice(0, 10);
  const opts = (list, cur) => list.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  const MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  function addForm(x) {
    const cat = x ? x.cat : S.cat, mi = cat === 'miles', yr = (x ? x.date : today()).slice(0, 4);
    return '<div class="grid2"><div><label class="lab" for="e_cat">WHAT KIND</label><select class="field" id="e_cat">' + opts(E.CATS, cat) + '</select></div>'
      + '<div><label class="lab" for="e_date">DATE</label><input class="field" type="date" id="e_date" value="' + esc(x ? x.date : today()) + '"></div>'
      + (mi ? '<div><label class="lab" for="e_miles">MILES</label><input class="field" id="e_miles" inputmode="decimal" value="' + esc(x ? x.miles : '') + '" placeholder="24"></div><div><p class="mut small" style="margin:30px 0 0" id="e_rate">At ' + E.rate(yr) + ' cents a mile, the ' + yr + ' rate.</p></div>'
        : '<div><label class="lab" for="e_amt">AMOUNT</label><input class="field" id="e_amt" inputmode="decimal" value="' + esc(x ? (x.amount / 100).toFixed(2) : '') + '" placeholder="$0.00"></div>'
        + '<div><label class="lab" for="e_to">PAID TO</label><input class="field" id="e_to" value="' + esc(x ? x.paidTo : '') + '" placeholder="The photographer, the studio"></div>')
      + '</div><label class="lab" for="e_what">WHAT FOR</label><input class="field" id="e_what" value="' + esc(x ? x.what : '') + '" placeholder="' + (mi ? 'To the callback and back' : 'New headshots, theatrical look') + '">'
      + '<label class="lab" for="e_rec">RECEIPT</label><label class="btn ghost">' + (x && x.receipt ? 'REPLACE THE RECEIPT' : 'ADD A PHOTO OR PDF') + '<input type="file" id="e_rec" accept="image/*,application/pdf" hidden></label> <span class="mut small" id="e_recname">' + (x && x.receipt ? 'Receipt kept.' : '') + '</span>';
  }
  function render() {
    const yrs = E.years(); if (yrs.indexOf(S.year) < 0) S.year = yrs[0];
    const sm = E.summary(S.year), items = E.ofYear(S.year);
    let h = '';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    if (S.open) { const x = E.get(S.open); if (x) h += '<div class="card" id="detail"><p class="kick">CHANGE IT</p>' + addForm(x) + '<div class="row" style="margin-top:12px"><button class="btn" id="save">SAVE</button>' + (x.receipt ? '<button class="btn quiet" id="seerec">SEE THE RECEIPT</button>' : '') + '<button class="btn quiet" id="close">CLOSE</button><button class="btn quiet" id="del" style="margin-left:auto">REMOVE</button></div></div>'; }
    else h += '<div class="card" id="addbox"><p class="kick">ADD AN EXPENSE</p>' + addForm(null) + '<div class="row" style="margin-top:12px"><button class="btn" id="add">ADD IT</button></div></div>';
    h += '<div class="row" style="justify-content:space-between;margin-top:6px"><div class="chips" role="group" aria-label="Year">' + yrs.map(y => '<button type="button" class="chip' + (y === S.year ? ' on' : '') + '" data-year="' + y + '">' + y + '</button>').join('') + '</div></div>';
    h += '<div class="card" id="sum"><p class="kick">' + S.year + ' SO FAR</p><p class="tot">' + E.money(sm.total) + '</p><p class="mut small" style="margin:2px 0 10px">' + sm.n + ' expense' + (sm.n === 1 ? '' : 's') + (sm.miles ? ', ' + sm.miles + ' miles' : '') + '</p>'
      + (sm.cats.length ? '<table class="sum">' + sm.cats.map(c => '<tr><td>' + esc(c.name) + ' <span class="mut small">' + c.n + '</span></td><td>' + E.money(c.total) + '</td></tr>').join('') + '</table>' : '')
      + '<div class="row" style="margin-top:12px"><button class="btn" id="export"' + (sm.n ? '' : ' disabled') + '>FOR YOUR TAX PREPARER</button></div>'
      + '<p class="mut small" style="margin:8px 0 0">One file: a spreadsheet of every line and the totals, with the receipts beside it.</p></div>';
    let last = '';
    items.forEach(x => { const m = MON[+x.date.slice(5, 7) - 1]; if (m !== last) { h += '<p class="mon">' + m + '</p>'; last = m; }
      h += '<button type="button" class="person" data-open="' + x.id + '"><span class="amt">' + E.money(x.amount) + '</span><b>' + esc(x.what || E.catName(x.cat)) + '</b>'
        + '<span class="from">' + esc([x.date, E.catName(x.cat), x.paidTo, x.miles ? x.miles + ' miles' : '', x.receipt ? 'receipt kept' : ''].filter(Boolean).join(' · ')) + '</span></button>'; });
    if (!items.length) h += '<p class="empty">Nothing for ' + S.year + ' yet. Add the first one above: a class, your dues, the drive to a callback.</p>';
    h += '<div class="card"><p class="kick">GOOD TO KNOW</p><p class="small dim" style="margin:0">This is a record, not tax advice. What you can deduct depends on how you’re paid (W-2 or 1099), what you earned and where you live. Keep everything here; your tax preparer decides what counts.</p>'
      + '<p class="small dim" style="margin:8px 0 0">Miles go at the IRS business rate for the year. <label for="e_rateset">Your ' + S.year + ' rate, in cents a mile:</label> <input class="field" id="e_rateset" inputmode="decimal" value="' + E.rate(S.year) + '" style="width:110px;display:inline-block;min-height:38px;padding:6px 10px"></p></div>';
    $('view').innerHTML = h; S.msg = ''; wire();
  }
  function vals() { const mi = $('e_miles'); return { cat: $('e_cat').value, date: $('e_date').value, amount: mi ? 0 : $('e_amt').value, paidTo: $('e_to') ? $('e_to').value : '', what: $('e_what').value, miles: mi ? mi.value : 0 }; }
  let REC = null;
  function wire() {
    const c = $('e_cat'); if (c) c.onchange = () => { const keep = { date: $('e_date').value, what: $('e_what').value }; S.cat = c.value; render(); if (!S.open) { $('e_date').value = keep.date; $('e_what').value = keep.what; } };
    const r = $('e_rec'); if (r) r.onchange = () => { REC = r.files && r.files[0] || null; $('e_recname').textContent = REC ? REC.name : ''; };
    if ($('add')) $('add').onclick = async () => { const v = vals(); const x = E.add(v); if (!x) { S.msg = v.cat === 'miles' ? 'Put in the miles.' : 'Put in the amount.'; render(); return; }
      if (REC) await E.putReceipt(x.id, REC); REC = null; S.year = x.date.slice(0, 4); S.msg = 'Added: ' + (x.what || E.catName(x.cat)) + ', ' + E.money(x.amount) + '.'; render(); };
    if ($('save')) $('save').onclick = async () => { const x = E.set(S.open, vals()); if (REC) await E.putReceipt(S.open, REC); REC = null; S.msg = 'Saved.'; S.open = ''; S.year = x.date.slice(0, 4); render(); };
    if ($('close')) $('close').onclick = () => { S.open = ''; REC = null; render(); };
    if ($('del')) $('del').onclick = async () => { const x = E.get(S.open); if (x && x.receipt) await E.dropReceipt(x.id); E.remove(S.open); S.open = ''; S.msg = 'Removed.'; render(); };
    if ($('seerec')) $('seerec').onclick = async () => { const b = await E.receipt(S.open); if (b) window.open(URL.createObjectURL(b), '_blank'); };
    document.querySelectorAll('[data-year]').forEach(b => b.onclick = () => { S.year = b.dataset.year; render(); });
    document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { S.open = b.dataset.open; REC = null; const x = E.get(S.open); S.cat = x.cat; render(); $('detail').scrollIntoView({ block: 'start' }); });
    const rs = $('e_rateset'); if (rs) rs.onchange = () => { const n = parseFloat(rs.value); if (isFinite(n) && n > 0) { E.setRate(S.year, n); E.ofYear(S.year).filter(x => x.cat === 'miles').forEach(x => E.set(x.id, { miles: x.miles })); S.msg = 'Miles in ' + S.year + ' now go at ' + n + ' cents a mile.'; render(); } };
    if ($('export')) $('export').onclick = async () => {
      const files = [], items = E.ofYear(S.year), names = {};
      for (const x of items) if (x.receipt) { const b = await E.receipt(x.id); if (b) { const ext = /pdf/.test(b.type) ? 'pdf' : /png/.test(b.type) ? 'png' : 'jpg'; const n = 'receipts/' + E.receiptName(x, ext); names[x.id] = n; files.push({ name: n, data: new Uint8Array(await b.arrayBuffer()) }); } }
      files.unshift({ name: 'Expenses ' + S.year + '.csv', data: E.csv(S.year, x => names[x.id] || '') });
      const blob = new Blob([Zip.make(files)], { type: 'application/zip' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'Expenses ' + S.year + '.zip'; document.body.appendChild(a); a.click(); a.remove();
      window.__lastExport = { n: items.length, receipts: files.length - 1 };
      S.msg = 'Saved Expenses ' + S.year + '.zip: the spreadsheet and ' + (files.length - 1) + ' receipt' + (files.length === 2 ? '' : 's') + '. Send it to your tax preparer however you like.'; render();
    };
  }
  render();
  window.EXPENSES = { render, state: S };
})();
