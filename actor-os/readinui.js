/* READ IN, your side (shared/readin.js has the parts). In the Reader booth: ASK A FRIEND TO READ makes a link with
   this scene in it; they record the other parts on their own time and send back one file; BRING IN THEIR READ puts
   every line where it goes. A real person's voice, never a computer one. */
(function () {
  const $r = id => document.getElementById(id);
  const e2 = s => (window.esc2 ? esc2(s) : String(s == null ? '' : s));
  function sceneNow() {
    const om = SIDES.omit || [];
    const lines = activeScript().filter(b => om.indexOf(b.who) < 0).map(b => ({ k: boothKey(b), who: b.who, text: b.text, mine: !!b.mine }));
    let title = ''; try { title = (state && state.job && state.job.project) || ''; } catch (e) { }
    if (/^untitled performance$/i.test(title)) title = '';
    if (!title) title = String(SIDES.file || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
    let from = ''; try { from = localStorage.getItem('actor_os_name') || (window.You && You.get && You.get('name')) || ''; } catch (e) { }
    return { v: 1, title, file: SIDES.file || '', me: SIDES.me || '', from, lines };
  }
  window.readInBox = function () {
    return `<div class="pocketbox" id="readInBox"><b>A FRIEND READS IN</b><span>Send a friend a link to this scene. They record the other parts in their own voice, whenever suits them, and send you back one file. No call, no set time.</span>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="ghost" id="riAsk" onclick="readInAsk()">ASK A FRIEND TO READ</button>
      <label class="fbtn" id="riBring" title="The file your friend sent back">BRING IN THEIR READ<input type="file" id="riFile" accept=".zip,application/zip" onchange="readInBring(this)"></label></div></div>`;
  };
  window.readInAsk = async function () {
    const sc = sceneNow(); if (!sc.lines.some(l => !l.mine)) return;
    const url = new URL('../read/', location.href).href + (await ReadIn.pack(sc));
    window.__readInLink = url;
    let w = $r('readInSheet'); if (!w) { w = document.createElement('div'); w.id = 'readInSheet'; document.body.appendChild(w); }
    const n = sc.lines.filter(l => !l.mine).length, parts = [...new Set(sc.lines.filter(l => !l.mine).map(l => l.who))];
    w.innerHTML = `<div style="position:fixed;inset:0;z-index:9000;background:rgba(8,8,8,.96);color:#ece7dc;overflow:auto;padding:max(18px,env(safe-area-inset-top)) 16px 40px"><div style="max-width:520px;margin:0 auto;display:grid;gap:12px">
      <button class="ghost" style="justify-self:end" onclick="document.getElementById('readInSheet').remove()">CLOSE</button>
      <b style="font-size:11px;letter-spacing:.2em;color:#e0a23c">ASK A FRIEND TO READ</b>
      <div>They'll read ${e2(parts.join(', '))}: ${n} line${n === 1 ? '' : 's'}. They see your lines too, faded, so they know what they're answering.</div>
      <textarea id="riLink" readonly rows="3" style="width:100%;font-size:12px">${e2(url)}</textarea>
      <div class="row" style="gap:8px;flex-wrap:wrap">${navigator.share ? '<button id="riShare">SEND THE LINK</button>' : ''}<button class="ghost" id="riCopy">COPY THE LINK</button></div>
      <small style="color:#9a958c;line-height:1.5">The scene is inside the link itself, so it never sits on a server. Anyone with the link can read these sides, so send it only to someone you trust with them. When their file comes back, tap BRING IN THEIR READ.</small>
      <small id="riSaid" style="color:#e0a23c"></small></div></div>`;
    const said = t => { const s = $r('riSaid'); if (s) s.textContent = t; };
    const c = $r('riCopy'); if (c) c.onclick = async () => { try { await navigator.clipboard.writeText(url); said('Copied. Paste it into a text or an email.'); } catch (e) { const t = $r('riLink'); t.select(); said('Selected. Copy it from the box.'); } };
    const s = $r('riShare'); if (s) s.onclick = async () => { try { await navigator.share({ title: 'Read with me', text: 'Can you read the other parts for ' + (sc.title || 'my scene') + '? Whenever suits you. It takes a few minutes.', url }); said('Sent.'); } catch (e) { } };
  };
  window.readInBring = async function (input) {
    const f = input.files && input.files[0]; input.value = ''; if (!f) return;
    let got; try { got = ReadIn.unbundle(new Uint8Array(await f.arrayBuffer())); } catch (e) { BOOTHMSG = 'That file isn’t a read from a friend. It should be the .zip they sent back.'; return boothRefresh(); }
    const om = SIDES.omit || [], here = activeScript().filter(b => !b.mine && om.indexOf(b.who) < 0);
    const by = got.man.by || 'A friend'; let n = 0, miss = 0;
    for (const l of got.lines) {
      let b = here.find(x => boothKey(x) === l.k) || here.find(x => x.who === l.who && x.text === l.text);
      if (!b) { miss++; continue; }
      const k = boothKey(b), blob = new Blob([l.data], { type: ReadIn.mimeOf(l.file) });
      let dur = 0; try { dur = await ActorReader.duration(blob); } catch (e) { }
      const id = await ActorReader.putTakeFor(k, blob, { dur, from: 'friend', name: by });
      SIDES.pick = SIDES.pick || {}; SIDES.pick[k] = id; n++;
    }
    saveRange();
    BOOTHMSG = by + ' read ' + n + ' line' + (n === 1 ? '' : 's') + ' and ' + (n === 1 ? 'it’s' : 'they’re') + ' in.' + (miss ? ' ' + miss + ' didn’t match a line in this scene (the sides may have changed since you sent the link).' : '');
    boothRefresh();
  };
})();
