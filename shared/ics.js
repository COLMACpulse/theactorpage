/* THEACTORPAGE CALENDAR FILES: your plan and your agenda as a calendar file you open once, so your phone's own
   calendar does the reminding (a web page can't wake your phone on its own). Nothing is sent anywhere: the file is
   made here and handed to your calendar app.
   Ics.make([{uid, date:'YYYY-MM-DD', time:'HH:MM' (optional), mins, title, notes, url, alarm}]) -> text/calendar
     no time: an all-day event, with a reminder at 9 AM that day; a time: that time, a reminder 2 hours before.
   The same step keeps the same uid, so opening the file again updates it where the calendar app allows. */
(function (g) {
  'use strict';
  const I = {};
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  /* lines over 75 bytes fold onto the next line, as the format asks */
  const fold = l => { const out = []; let cur = '', n = 0; for (const ch of l) { const b = unescape(encodeURIComponent(ch)).length; if (n + b > 74) { out.push(cur); cur = ' '; n = 1; } cur += ch; n += b; } out.push(cur); return out.join('\r\n'); };
  const stamp = d => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  const day = s => String(s).slice(0, 10).replace(/-/g, '');
  const next = s => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); };
  I.make = function (events, opts) {
    opts = opts || {}; const now = stamp(opts.now ? new Date(opts.now) : new Date());
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//THEACTORPAGE//THE PLAN//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    if (opts.name) L.push('X-WR-CALNAME:' + esc(opts.name));
    (events || []).filter(e => e && /^\d{4}-\d\d-\d\d/.test(e.date || '') && e.title).forEach(e => {
      L.push('BEGIN:VEVENT', 'UID:' + esc((e.uid || (day(e.date) + '-' + Math.random().toString(36).slice(2))) + '@theactorpage'), 'DTSTAMP:' + now);
      if (e.time && /^\d\d:\d\d/.test(e.time)) {
        const [h, m] = e.time.split(':').map(Number), mins = e.mins || 30, end = h * 60 + m + mins;
        L.push('DTSTART:' + day(e.date) + 'T' + pad(h) + pad(m) + '00');
        L.push('DTEND:' + (end >= 1440 ? next(e.date) + 'T' + pad(Math.floor((end - 1440) / 60)) + pad(end % 60) + '00' : day(e.date) + 'T' + pad(Math.floor(end / 60)) + pad(end % 60) + '00'));
      } else L.push('DTSTART;VALUE=DATE:' + day(e.date), 'DTEND;VALUE=DATE:' + next(e.date), 'TRANSP:TRANSPARENT');
      L.push('SUMMARY:' + esc(e.title));
      if (e.notes || e.url) L.push('DESCRIPTION:' + esc([e.notes, e.url].filter(Boolean).join('\n')));
      if (e.url) L.push('URL:' + esc(e.url));
      if (e.alarm !== false) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(e.title), 'TRIGGER:' + (e.time ? '-PT2H' : 'PT9H'), 'END:VALARM');
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  };
  /* hand it to the calendar: a file the phone opens with Calendar */
  I.save = function (text, name) {
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = (String(name || 'plan').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || 'plan') + '.ics';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); return a.download;
  };
  g.Ics = I;
  if (typeof module !== 'undefined') module.exports = I;
})(typeof window !== 'undefined' ? window : globalThis);
