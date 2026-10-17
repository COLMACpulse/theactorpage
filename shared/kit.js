/* THEACTORPAGE KIT: the camera, mic and typewriter a tool uses, on its first screen, as tiles.
   You see what the tool can do with them before you go looking, and each tile says, live, whether
   it's OFF, ON, RECORDING or LISTENING. Tap a tile: straight to that thing.
   Tiles: [{id, dev:'camera'|'mic'|'typewriter'|'photo', label:'CAMERA', what:'shoot a take', note:'', off:false, icon:'mic'}]  (icon: draw another device's picture, e.g. a mic for speech)
   dev 'typewriter' is speech turned into words (your browser's speech service: Chrome sends it to
   Google, Safari to Apple), so its tile says so. The live state comes from shared/hot.js.
   Kit.html(tiles) -> markup. Kit.wire(root, {id: fn}) -> taps. Nothing here turns anything on. */
(function(g){
const K={};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
K.ICON={
 camera:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 15h8l3.5-5h13L34 15h8v23H6z"/><circle cx="24" cy="26" r="7.5"/><circle cx="24" cy="26" r="3"/></svg>',
 mic:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="18" y="5" width="12" height="23" rx="6"/><path d="M11 22a13 13 0 0 0 26 0M24 35v8M17 43h14"/></svg>',
 typewriter:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="24" width="36" height="16" rx="2"/><path d="M14 24V8h20v16M10 32h28M18 36h12"/><path d="M18 13h12M18 18h9"/></svg>',
 photo:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="10" width="36" height="28" rx="2"/><circle cx="17" cy="20" r="3.5"/><path d="M6 33l11-9 8 6 6-5 11 9"/></svg>'
};
/* state of one kind of device, from the camera / mic bar (shared/hot.js) */
K.state=function(dev){
 const H=g.Hot; let s=null; try{ s=H&&H.peek?H.peek():H&&H.status?H.status():null; }catch(e){}
 if(!s) return '';
 if(dev==='camera') return s.camera?(s.recording?'RECORDING':'ON'):'OFF';
 if(dev==='mic') return s.mic||s.listening?(s.recording?'RECORDING':s.listening?'LISTENING':'ON'):'OFF';
 if(dev==='typewriter') return s.listening?'LISTENING':'OFF';
 return '';
};
function css(){ if(document.getElementById('kitcss')) return; const st=document.createElement('style'); st.id='kitcss';
 st.textContent='.kit{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px;margin:0 0 16px}'
 +'.kit .kt{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;min-height:118px;padding:16px 10px 12px;border-radius:12px;cursor:pointer;font:inherit;color:inherit;'
 +'background:var(--panel,var(--card,#14171c));border:1px solid var(--line,var(--rule,#2a2f37))}'
 +'.kit .kt:hover{border-color:var(--tung,var(--tungsten,#e0a23c))}.kit .kt:focus-visible{outline:2px solid var(--tung,var(--tungsten,#e0a23c));outline-offset:2px}'
 +'.kit .kt svg{width:38px;height:38px;fill:none;stroke:var(--tung,var(--tungsten,#e0a23c));stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}'
 +'.kit .kt b{font:700 13px/1.2 "Courier Prime",ui-monospace,monospace;letter-spacing:.14em;color:var(--tung-text,var(--tung,var(--tungsten,#e0a23c)))}'
 +'.kit .kt span{font-size:13px;line-height:1.3;color:var(--dim,var(--faint,#9aa0a8))}.kit .kt small{font-size:11px;line-height:1.3;color:var(--faint,#8a8f98)}'
 +'.kit .kt i{position:absolute;top:8px;right:8px;font:600 10px/1 system-ui,-apple-system,"Segoe UI",sans-serif;font-style:normal;letter-spacing:.08em;padding:4px 7px;border-radius:99px;border:1px solid var(--line,#2a2f37);color:var(--faint,#8a8f98)}'
 +'.kit .kt i.on{background:#e0a23c;border-color:#e0a23c;color:#1a1206}.kit .kt i.hot{background:#d6332a;border-color:#d6332a;color:#fff}'
 +'.kit .kt.off{opacity:.55}';
 (document.head||document.documentElement).appendChild(st); }
const cls=w=>w==='OFF'?'':w==='ON'?'on':'hot';
K.html=function(tiles){
 css();
 return '<div class="kit" role="group" aria-label="Camera and mic">'+(tiles||[]).map(t=>{ const w=K.state(t.dev);
  return '<button type="button" class="kt'+(t.off?' off':'')+'" data-kit="'+esc(t.id)+'" data-kdev="'+esc(t.dev)+'">'+(w?'<i class="'+cls(w)+'" data-kst>'+w+'</i>':'')
   +(K.ICON[t.icon||t.dev]||'')+'<b>'+esc(t.label||t.dev.toUpperCase())+'</b><span>'+esc(t.what||'')+'</span>'+(t.note?'<small>'+esc(t.note)+'</small>':'')+'</button>'; }).join('')+'</div>';
};
K.wire=function(root,fns){
 (root||document).querySelectorAll('[data-kit]').forEach(b=>{ const f=fns&&fns[b.dataset.kit]; if(f) b.onclick=e=>{ e.preventDefault(); f(e); }; });
 K.paint();
};
/* keep the OFF / ON / RECORDING words true while the page is open */
K.paint=function(){ document.querySelectorAll('.kit [data-kdev]').forEach(b=>{ const w=K.state(b.dataset.kdev), i=b.querySelector('[data-kst]'); if(!i||!w) return; if(i.textContent!==w){ i.textContent=w; i.className=cls(w); } }); };
if(typeof window!=='undefined'){ window.addEventListener('hot:change',K.paint); setInterval(K.paint,1500); }
K.speechNote='Words go through your browser’s speech service (Chrome: Google, Safari: Apple).';
g.Kit=K;
if(typeof module!=='undefined') module.exports=K;
})(typeof window!=='undefined'?window:globalThis);
