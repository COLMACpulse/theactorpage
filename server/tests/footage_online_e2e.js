/* FOOTAGE: A FOLDER, TO ONLINE, end to end (Col, Oct 28: "i click add a drive or folder, i point it at a folder- the
   system recognizes what is available, what will work/what needs work, and asks me which files i want to upload. then
   uploads them and stores them on the site"). The real Footage page against the host (server/worker.js in Miniflare on
   :8787, 5 MB parts so a bigger clip goes up in pieces). A made-up folder: clips, the same clip twice (one inside a zip),
   a clip inside a zip, an iPhone HEVC file, a VideoPad project, a picture. Made-up actor, made-up names.
   Computer light (the whole run, and a second computer that gets in with the backup code), phone dark.
   Site on :8811.  NODE_PATH=<playwright + miniflare> node server/tests/footage_online_e2e.js */
const { chromium } = require('playwright'); const { Miniflare } = require('miniflare'); const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const R = path.join(__dirname, '..', '..'), FX = path.join(R, 'shared', 'fixtures'), SP = '/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad';
const salt = fs.readFileSync(path.join(R, 'footage', 'tests', 'fixtures', 'map', 'Black SSD', 'SALT ROAD', 'DAY 2', 'SALT_ROAD_EP3_SC12_T04.webm'));
const night = fs.readFileSync(path.join(FX, 'site_sample', 'media', 'clip-night.webm')), harbor = fs.readFileSync(path.join(FX, 'site_sample', 'clip-harbor.webm')), reel = fs.readFileSync(path.join(FX, 'site_sample', 'media', 'reel.webm'));
const HEVC = Buffer.concat([Buffer.from([0, 0, 0, 20]), Buffer.from('ftypqt  '), Buffer.from([0, 0, 0, 0]), Buffer.from('qt  '), Buffer.alloc(64), Buffer.from('moov....trak....stsd....hvc1'), Buffer.alloc(4096)]);
function folder() {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'reels-')), D = path.join(T, 'ACTIVE REELS'); fs.mkdirSync(path.join(D, 'compressD'), { recursive: true });
  fs.writeFileSync(path.join(D, 'SALT_ROAD_sc12.webm'), salt); fs.writeFileSync(path.join(D, 'night_ferry.webm'), night);
  fs.writeFileSync(path.join(D, 'harbor.webm'), harbor); fs.writeFileSync(path.join(D, 'compressD', 'harbor2.webm'), harbor);
  fs.writeFileSync(path.join(D, 'big_dock_scene.webm'), Buffer.concat([reel, Buffer.alloc(11 * 1048576)]));
  fs.writeFileSync(path.join(D, 'IMG_4471.MOV'), HEVC); fs.writeFileSync(path.join(D, 'REEL.vpb'), Buffer.alloc(3000, 7)); fs.writeFileSync(path.join(D, 'snapshot.jpg'), fs.readFileSync(path.join(FX, 'made_up_face.jpg')));
  const W = fs.mkdtempSync(path.join(os.tmpdir(), 'zipsrc-')); fs.writeFileSync(path.join(W, 'low_tide_scene.webm'), reel); fs.writeFileSync(path.join(W, 'night_again.webm'), night); fs.writeFileSync(path.join(W, 'readme.txt'), 'made up');
  execFileSync('python3', ['-I', '-c', `import zipfile,sys
w=sys.argv[1]; d=sys.argv[2]
z=zipfile.ZipFile(d+'/LOWTIDE.zip','w',zipfile.ZIP_STORED); z.write(w+'/low_tide_scene.webm','low_tide_scene.webm'); z.close()
z=zipfile.ZipFile(d+'/NIGHT.zip','w',zipfile.ZIP_DEFLATED); z.write(w+'/night_again.webm','night_again.webm'); z.close()
z=zipfile.ZipFile(d+'/notes.zip','w'); z.write(w+'/readme.txt','readme.txt'); z.close()`, W, D]);
  return D;
}
(async () => {
  let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 500))); if (!x) ok = false; };
  const mf = new Miniflare({ modules: true, scriptPath: path.join(__dirname, '..', 'worker.js'), r2Buckets: ['SITES'], port: 8787, bindings: { ORIGINS: 'http://localhost:8811', LIB_MB: '5120', PART_MB: '5' } });
  await mf.ready;
  const DIR = folder();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const mk = async (vp, cs) => { const c = await b.newContext({ viewport: vp, colorScheme: cs }); await c.addInitScript(() => { try { window.showDirectoryPicker = undefined; localStorage.setItem('tap_api', 'http://localhost:8787'); } catch (e) { } }); return c; };
  const fresh = async p => { await p.goto('http://localhost:8811/footage/'); await p.evaluate(async () => { localStorage.clear(); localStorage.setItem('tap_api', 'http://localhost:8787'); for (const n of ['theactorpage_footage_lib', 'theactorpage_takes']) await new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = r; }); }); await p.reload(); await p.waitForTimeout(500); };
  const scanIt = async p => { await p.setInputFiles('#adddrive', DIR); await p.waitForFunction(() => FOOTAGE.scan() && !FOOTAGE.scan().busy, null, { timeout: 90000 }).catch(() => { }); await p.waitForTimeout(300); };
  let BACKUP = '';

  /* ===== computer, light ===== */
  { const c = await mk({ width: 1280, height: 900 }, 'light'), p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('dialog: ' + d.message()); d.dismiss(); });
    await fresh(p); await p.evaluate(() => You.set('name', 'Sam Actor')); await p.reload(); await p.waitForTimeout(400);
    await scanIt(p);
    const R0 = await p.evaluate(() => { const r = FOOTAGE.scan().res; return { ready: r.ready.map(v => v.name).sort(), twice: r.twice.map(g => g.map(v => v.name)), work: r.work.map(v => v.name + ': ' + v.what), notvid: r.notvid.map(v => v.name + ': ' + v.what), zips: r.zips.length, picked: FOOTAGE.scan().pick.length }; });
    want('READY: what plays as is, a clip inside a zip too', JSON.stringify(R0.ready) === JSON.stringify(['SALT_ROAD_sc12.webm', 'big_dock_scene.webm', 'low_tide_scene.webm']), R0);
    want('THE SAME CLIP TWICE: a copy in another folder, and one inside a packed zip; the first of each kept', R0.twice.length === 2 && R0.twice.some(g => g.includes('harbor.webm') && g.includes('harbor2.webm')) && R0.twice.some(g => g.includes('night_ferry.webm') && g.includes('night_again.webm')), R0.twice);
    want('NEEDS WORK: the iPhone file, read as HEVC', R0.work.length === 1 && /IMG_4471\.MOV: HEVC, what an iPhone records/.test(R0.work[0]), R0.work);
    want('NOT A VIDEO: the VideoPad project, the picture, the zip with no videos', R0.notvid.length === 3 && R0.notvid.some(x => /REEL\.vpb is a VideoPad project/.test(x)) && R0.notvid.some(x => /snapshot\.jpg: A picture/.test(x)) && R0.notvid.some(x => /notes\.zip: A zip with no videos/.test(x)), R0.notvid);
    want('three zips opened; ticked: the 3 ready and one of each pair', R0.zips === 3 && R0.picked === 5, R0);
    let v = await p.innerText('#view');
    want('it says nothing has left this computer yet', /Nothing has left this computer yet/.test(v) && /READY · 3/.test(v) && /THE SAME CLIP TWICE · 2/.test(v) && /NEEDS WORK · 1/.test(v) && /NOT A VIDEO · 3/.test(v));
    want('UPLOAD: 5 clips, the originals, only you see them; first, your address', /5 clips · /.test(v) && /The originals, full quality\. Only you can see them/.test(v) && /First, your address/.test(v) && !!(await p.$('#ac_claim')) && !(await p.$('#up_go')));
    await p.fill('#ac_name', 'sam-actor-test'); await p.waitForTimeout(900);
    want('the address: free, in plain words', /sam-actor-test\.theactorpage\.com is free/.test(await p.innerText('#ac_why')));
    await p.click('#ac_claim'); await p.waitForTimeout(800);
    v = await p.innerText('#view'); BACKUP = (await p.innerText('#bk_code').catch(() => '')).trim();
    await p.uncheck('[aria-label="low_tide_scene.webm"]'); await p.check('[aria-label="low_tide_scene.webm"]'); await p.waitForTimeout(150);
    want('the backup code stays on screen after another click, until you say it\'s written down', (await p.innerText('#bk_code').catch(() => '')).trim() === BACKUP && /Without it, there.s no way back in/.test(await p.innerText('#codebox')));
    await p.click('#bk_kept'); await p.waitForTimeout(150); want('I WROTE IT DOWN: it goes', !(await p.$('#codebox')));
    want('MAKE IT MINE: yours, and the backup code to write down', /It.s yours: sam-actor-test\.theactorpage\.com/.test(v) && BACKUP.length > 10 && !!(await p.$('#up_go')), v.slice(0, 300));
    want('how much of your 5 GB it uses, and about how long', /of your 5 GB/.test(v) && /About \d+ to \d+ minutes on home Wi-Fi/.test(v));
    await p.uncheck('[aria-label="low_tide_scene.webm"]'); await p.waitForTimeout(200);
    want('untick one: 4 clips', /UPLOAD 4 CLIPS/.test(await p.innerText('#up_go')));
    await p.check('[aria-label="low_tide_scene.webm"]'); await p.fill('#sc_title', 'Salt Road');
    /* the Wi-Fi drops once, partway through the big one */
    let dropped = 0; await p.route('**/api/lib/**/part/**', async rt => { if (/p=2/.test(rt.request().url()) && !dropped) { dropped++; return rt.abort('internetdisconnected'); } return rt.continue(); });
    await p.click('#up_go'); await p.waitForTimeout(150);
    await p.click('#up_pause').catch(() => { }); await p.waitForTimeout(200);
    v = await p.innerText('#upcard');
    want('uploading: how far, PAUSE, keep this page open', /PAUSED · \d OF 5/.test(v) && /Keep this page open/.test(v) && /KEEP GOING/.test(v), v);
    await p.click('#up_pause');
    await p.waitForFunction(() => FOOTAGE.up() && FOOTAGE.up().over, null, { timeout: 120000 }).catch(() => { });
    v = await p.innerText('#view');
    want('done: 5 clips online, even with the Wi-Fi dropping once', /5 clips online\./.test(v) && dropped === 1 && /DONE · 5 OF 5/.test(v), [v.slice(0, 200), dropped]);
    const srv = await p.evaluate(async () => (await FootCloud.list()));
    want('on the host: 5 originals, byte for byte the same size, 11 MB one in parts', srv.items.length === 5 && srv.items.every(x => x.done) && srv.items.find(x => x.name === 'big_dock_scene.webm').size > 11 * 1048576, srv.items.map(x => x.name + ':' + x.size));
    await p.click('#up_lib'); await p.waitForTimeout(500);
    v = await p.innerText('#view');
    want('your library: the 5, ONLINE · ONLY YOU, under what they\'re from', (v.match(/ONLINE · ONLY YOU/g) || []).length === 5 && /Salt Road/.test(v), v.slice(0, 400));
    const key = await p.evaluate(() => FOOTAGE.pieces().find(x => x.kind === 'cloud' && x.name === 'SALT_ROAD_sc12.webm').key);
    await p.click('[data-piece="' + key + '"]'); await p.waitForTimeout(400);
    await p.waitForFunction(() => { const v = document.getElementById('pv'); return v && v.readyState >= 1 && v.duration > 0; }, null, { timeout: 15000 }).catch(() => { });
    const pv = await p.evaluate(() => { const v = document.getElementById('pv'); return v ? { src: v.src, d: v.duration } : null; });
    want('open one: it plays from online, with a link only you get', pv && /localhost:8787\/v\/sam-actor-test\//.test(pv.src) && pv.d > 0.5, pv);
    want('it says where it is: online, the original, only you', /Online, the original · .* Only you can see it, on any phone or computer/.test(await p.innerText('#view')));
    /* SEND A LINK, and turning it off */
    await p.click('#sh_link'); await p.waitForTimeout(500);
    const shareUrl = await p.inputValue('#sh_url').catch(() => '');
    want('SEND A LINK: a link anyone can watch for 7 days, and how to stop it', /localhost:8787\/v\/sam-actor-test\//.test(shareUrl) && /Anyone with this link can watch it for 7 days\. TURN OFF ITS LINKS stops it sooner/.test(await p.innerText('#sharebox')), shareUrl);
    want('the link works', (await p.evaluate(async u => (await fetch(u)).status, shareUrl)) === 200);
    await p.click('#sh_off'); await p.waitForTimeout(400);
    want('TURN OFF ITS LINKS: the link you sent stops working, it still plays here', (await p.evaluate(async u => (await fetch(u)).status, shareUrl)) === 403 && /Every link you sent to it has stopped working/.test(await p.innerText('#view')));
    /* SEND THE FILE: the whole original, with how far along */
    const dl = p.waitForEvent('download', { timeout: 20000 }).catch(() => null); await p.click('#sh_file'); const d = await dl;
    const dlf = d ? await d.path() : null;
    want('SEND THE FILE: the original, byte for byte (saved here; a phone opens the share sheet)', d && /SALT_ROAD_sc12\.webm$/.test(d.suggestedFilename()) && fs.statSync(dlf).size === salt.length, d && d.suggestedFilename());
    /* TRIM A MOMENT from the link: no download first */
    await p.waitForTimeout(400); await p.click('#trimit'); await p.waitForTimeout(600);
    const tsrc = await p.evaluate(() => { const v = document.getElementById('tr_vid'); return v ? v.src : ''; });
    want('TRIM A MOMENT plays straight from online, nothing downloaded first', /localhost:8787\/v\/sam-actor-test\//.test(tsrc), tsrc);
    await p.waitForFunction(() => { const v = document.getElementById('tr_vid'); return v && v.readyState >= 1; }, null, { timeout: 15000 }).catch(() => { });
    await p.click('#tr_make'); await p.waitForFunction(() => document.getElementById('tr_done'), null, { timeout: 30000 }).catch(() => { });
    want('the moment is made, from the online original', /MADE[\s\S]*Salt_Road_clip\.webm/i.test(await p.innerText('#view')) && (await p.evaluate(() => Takes.all().length)) === 1, (await p.innerText('#view')).slice(0, 400));
    await p.click('#tr_close').catch(() => { }); await p.waitForTimeout(300);
    /* PUT IT ON MY PAGE, under a credit */
    const kB = await p.evaluate(() => FOOTAGE.pieces().find(x => x.kind === 'cloud' && x.name === 'big_dock_scene.webm').key);
    await p.evaluate(k => FOOTAGE.go('piece', { key: k }), kB); await p.waitForTimeout(500);
    want('YOUR PAGE: only you see it until you put it on', /Only you can see it until you put it on your page/.test(await p.innerText('#pagebox')));
    await p.click('#pg_open'); await p.selectOption('#pg_where', 'Salt Road'); await p.click('#pg_on'); await p.waitForTimeout(300);
    const op = await p.evaluate(() => FOOTAGE.onPage());
    want('PUT IT ON MY PAGE: under Salt Road; goes up next time you put your page online', op.length === 1 && op[0].credit === 'Salt Road' && op[0].name === 'big_dock_scene.webm' && /On your page, under Salt Road\. It goes up the next time you put your page online/.test(await p.innerText('#pagebox')), op);
    /* the Hub: SEE IT has it from online; PUT IT ONLINE copies it on the host */
    await p.goto('http://localhost:8811/hub/?tab=package'); await p.waitForTimeout(2500);
    want('Your page lists it: From Footage, online', /From Footage, online/.test(await p.innerText('#onit')));
    const see = await p.evaluate(async () => { const d = await pkgDoc({ see: true }); return /localhost:8787\/v\/sam-actor-test\//.test(d); });
    want('SEE IT: it plays on your page, from online', see);
    const ents = await p.evaluate(async () => (await siteEntries('https://sam-actor-test.theactorpage.com')).filter(e => e.copyFrom).map(e => e.name + ':' + e.size));
    want('put online: it goes as a copy on the host, not sent again', ents.length === 1 && /^media\/online_.+\.webm:\d+$/.test(ents[0]), ents);
    await p.evaluate(() => goOnline()); await p.waitForFunction(() => !ON.busy, null, { timeout: 30000 }).catch(() => { });
    const pub = await (async (n) => { const h = await (await fetch('http://localhost:8787/s/' + n + '/')).text(); const m = h.match(/media\/online_[^"]+\.webm/); if (!m) return { h: h.length, why: await p.evaluate(() => ON.err) }; const r = await fetch('http://localhost:8787/s/' + n + '/' + m[0], { headers: { range: 'bytes=0-9' } }); return { m: m[0], s: r.status }; })('sam-actor-test');
    want('on your public page, it plays', pub.s === 206, pub);
    await p.goto('http://localhost:8811/footage/'); await p.waitForTimeout(800);
    await p.evaluate(k => FOOTAGE.go('piece', { key: k }), key); await p.waitForTimeout(500);
    await p.click('#rm1'); await p.waitForTimeout(200);
    want('REMOVE IT FROM ONLINE: gone from every device, your original stays', /off theactorpage\.com\? It.s gone from online, on every phone and computer\. Your original stays/.test(await p.innerText('#rmone')));
    await p.click('#rm1_yes'); await p.waitForTimeout(600);
    want('removed: 4 left, here and on the host', (await p.evaluate(async () => (await FootCloud.list()).items.length)) === 4 && (await p.evaluate(() => FOOTAGE.pieces().filter(x => x.kind === 'cloud').length)) === 4);
    /* the same folder again */
    await scanIt(p);
    const R1 = await p.evaluate(() => { const r = FOOTAGE.scan().res; return { online: r.online.length, ready: r.ready.map(v => v.name) }; });
    want('the same folder again: what\'s online is left out, the one you removed is back', R1.online === 4 && JSON.stringify(R1.ready) === JSON.stringify(['SALT_ROAD_sc12.webm']) && /4 clips from here are already online, left out/.test(await p.innerText('#view')), R1);
    await p.screenshot({ path: SP + '/fol_scan_computer.png', fullPage: true });
    want('computer: nothing sideways, plain words, no pop-ups, no errors', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && !/—/.test(await p.innerText('body')) && !errs.length, errs);
    await c.close(); }

  /* ===== another computer: the backup code ===== */
  { const c = await mk({ width: 1280, height: 900 }, 'light'), p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await fresh(p); await scanIt(p);
    await p.click('#ac_have'); await p.fill('#ac_name', 'sam-actor-test'); await p.fill('#ac_code', BACKUP); await p.click('#ac_rec'); await p.waitForTimeout(800);
    want('another computer: the backup code gets you in', /You.re in/.test(await p.innerText('#view')) && !!(await p.$('#up_go')));
    await p.click('#back'); await p.waitForTimeout(400);
    want('and your 4 online clips are there', (await p.evaluate(() => FOOTAGE.pieces().filter(x => x.kind === 'cloud').length)) === 4 && !errs.length, errs);
    await c.close(); }

  /* ===== phone, dark ===== */
  { const c = await mk({ width: 390, height: 844 }, 'dark'), p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await fresh(p); await scanIt(p);
    await p.fill('#ac_name', 'riley-phone-test'); await p.click('#ac_claim'); await p.waitForTimeout(800);
    for (const nm of ['big_dock_scene.webm', 'low_tide_scene.webm', 'harbor.webm', 'night_ferry.webm']) await p.uncheck('[aria-label="' + nm + '"]');
    want('phone: pick just one', /UPLOAD 1 CLIP/.test(await p.innerText('#up_go')));
    await p.screenshot({ path: SP + '/fol_scan_phone.png', fullPage: true });
    await p.click('#up_go'); await p.waitForFunction(() => FOOTAGE.up() && FOOTAGE.up().over, null, { timeout: 60000 }).catch(() => { });
    await p.click('#up_lib'); await p.waitForTimeout(500);
    want('phone: it\'s in the library, online', (await p.evaluate(() => FOOTAGE.pieces().filter(x => x.kind === 'cloud').length)) === 1);
    await p.screenshot({ path: SP + '/fol_lib_phone.png', fullPage: true });
    want('phone: nothing sideways, no errors', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && !errs.length, errs);
    await c.close(); }
  await b.close(); await mf.dispose(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
