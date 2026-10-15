/*
  Character Capsule — a panel for Writers Blockage.

  A character is not a file. It is a stateful object you keep consistent.

  The Identity Stack scoring is carried over exactly: weights, completeness,
  readiness, risk, weighted deviation, continuity, severity bands. Nothing in
  that model has been altered.

  What is added here is the one thing the standalone builder cannot do — the
  script is right there. A capsule can be seeded from who actually speaks, and
  once a baseline is locked, movement in the written dialogue is measured
  against the pages rather than only against the form. That measurement is
  reported beside the capsule drift, never folded into it.

  Capsules share the library key with the standalone builder, so a character
  built in either place shows up in both. Export is the same JSON.
*/
(function(){
"use strict";

var LIB_KEY = "colmac_capsules_v1";

/* ---------- schema, carried over ---------- */

var SECTIONS = [
  {key:"story", label:"Story / Canon", fields:[
    {k:"role", label:"Role", t:"str"},
    {k:"world", label:"World", t:"str"},
    {k:"canon_notes", label:"Canon notes", t:"list"},
    {k:"timeline_anchors", label:"Timeline anchors", t:"list"}]},
  {key:"performance", label:"Performance", fields:[
    {k:"objective", label:"Objective", t:"str"},
    {k:"obstacle", label:"Obstacle", t:"str"},
    {k:"tactics", label:"Tactics", t:"list"},
    {k:"emotional_range", label:"Emotional range", t:"list"},
    {k:"continuity_rules", label:"Continuity rules", t:"list"}]},
  {key:"voice", label:"Voice", fields:[
    {k:"cadence", label:"Cadence", t:"str"},
    {k:"tone", label:"Tone", t:"str"},
    {k:"rhythm", label:"Rhythm", t:"str"},
    {k:"speech_habits", label:"Speech habits", t:"list"},
    {k:"sample_refs", label:"Sample refs", t:"list"}]},
  {key:"face", label:"Face", fields:[
    {k:"visual_notes", label:"Visual notes", t:"list"},
    {k:"expression_rules", label:"Expression rules", t:"list"},
    {k:"reference_refs", label:"Reference refs", t:"list"},
    {k:"likeness_constraints", label:"Likeness constraints", t:"list"}]},
  {key:"relationships", label:"Relationships", flatlist:true},
  {key:"constraints", label:"Constraints", fields:[
    {k:"consent_required", label:"Consent required", t:"bool"},
    {k:"synthetic_generation_allowed", label:"Synthetic generation allowed", t:"bool"},
    {k:"do_not_merge_with", label:"Do not merge with", t:"list"},
    {k:"protected_traits", label:"Protected traits", t:"list"}]}
];

var WEIGHTS = {story:1.15, performance:1.10, voice:1.20, face:1.05, relationships:0.85, constraints:1.25};

var SEV_COLOUR = {"Stable":"#4f9d69","Watch":"#c8892f","Revision Needed":"#d2762f",
                  "Identity Break Risk":"#c25a4e","Identity Failure":"#a33a30"};

function uid(){ return "CAP-" + Math.random().toString(36).slice(2,7).toUpperCase(); }

function blank(){
  return {capsule_id:uid(), character_name:"", version:"1.0", status:"draft",
    story:{role:"", world:"", canon_notes:[], timeline_anchors:[]},
    performance:{objective:"", obstacle:"", tactics:[], emotional_range:[], continuity_rules:[]},
    voice:{cadence:"", tone:"", rhythm:"", speech_habits:[], sample_refs:[]},
    face:{visual_notes:[], expression_rules:[], reference_refs:[], likeness_constraints:[]},
    relationships:[],
    constraints:{consent_required:false, synthetic_generation_allowed:false,
                 do_not_merge_with:[], protected_traits:[]}};
}

/* ---------- the Identity Stack, unchanged ---------- */

function clamp(x, lo, hi){ lo = lo === undefined ? 0 : lo; hi = hi === undefined ? 1 : hi;
  return Math.max(lo, Math.min(hi, x)); }

function comp(v){
  if(v == null) return 0;
  if(typeof v === "string") return v.trim() ? 1 : 0;
  if(Array.isArray(v)) return clamp(v.filter(function(x){ return String(x).trim(); }).length / 3);
  if(typeof v === "boolean") return 1;
  if(typeof v === "object"){
    var vals = Object.keys(v).map(function(k){ return v[k]; });
    if(!vals.length) return 0;
    return vals.map(comp).reduce(function(a,b){ return a+b; }, 0) / vals.length;
  }
  return 0.5;
}
function sectionComp(cap, key){ return comp(cap[key] != null ? cap[key] : {}); }
function readiness(cap){
  var num = 0, den = 0;
  for(var k in WEIGHTS){ num += WEIGHTS[k] * sectionComp(cap, k); den += WEIGHTS[k]; }
  return clamp(num / den);
}
function risk(cap){
  var x = cap.constraints || {}, r = 0;
  if(x.consent_required && x.synthetic_generation_allowed) r += 0.45;
  if(!cap.constraints) r += 0.20;
  if((x.protected_traits || []).length) r += 0.15;
  return clamp(r);
}
function weightedDev(deltas){
  var t = 0;
  for(var k in WEIGHTS) t += WEIGHTS[k] * deltas[k] * deltas[k];
  return Math.sqrt(t);
}
function continuity(dev, k){ return clamp(Math.exp(-(k === undefined ? 1.75 : k) * dev)); }
function severity(d){
  return d <= 0.10 ? "Stable" : d <= 0.25 ? "Watch" : d <= 0.45 ? "Revision Needed"
       : d <= 0.70 ? "Identity Break Risk" : "Identity Failure";
}
function changedField(b, c){
  if(b == null) return false;
  if(typeof b === "string") return b.trim() !== "" && String(c || "").trim() !== b.trim();
  if(Array.isArray(b)){
    if(!b.length) return false;
    var cur = Array.isArray(c) ? c : [];
    return !b.every(function(it){ return cur.indexOf(it) >= 0; });
  }
  if(typeof b === "boolean") return b !== !!c;
  return false;
}
function sectionChange(bSec, cSec){
  if(bSec == null) return 0;
  if(Array.isArray(bSec)){
    if(!bSec.length) return 0;
    var cur = Array.isArray(cSec) ? cSec : [];
    return bSec.every(function(it){ return cur.indexOf(it) >= 0; }) ? 0 : 1;
  }
  var keys = Object.keys(bSec), est = 0, chg = 0;
  keys.forEach(function(k){
    var bv = bSec[k];
    var established = typeof bv === "string" ? bv.trim() !== ""
                    : Array.isArray(bv) ? bv.length > 0
                    : typeof bv === "boolean" ? true : false;
    if(!established) return;
    est++;
    if(changedField(bv, cSec ? cSec[k] : undefined)) chg++;
  });
  return est ? chg / est : 0;
}
function driftMetrics(cap, baseline){
  if(!baseline) return {dev:0, cont:1, drift:0, changes:[]};
  var deltas = {}, changes = [];
  for(var k in WEIGHTS){
    var cr = sectionChange(baseline[k], cap[k]);
    deltas[k] = cr;
    if(cr > 0) changes.push(k);
  }
  var dev = weightedDev(deltas), cont = continuity(dev);
  return {dev:dev, cont:cont, drift:1 - cont, changes:changes};
}
function scoreAll(cap, baseline){
  var r = readiness(cap), rk = risk(cap), dm = driftMetrics(cap, baseline);
  var conf = clamp(0.45 * r + 0.40 * dm.cont - 0.15 * rk);
  var comps = {};
  Object.keys(WEIGHTS).forEach(function(k){ comps[k] = sectionComp(cap, k); });
  return {readiness:r, risk:rk, cont:dm.cont, drift:dm.drift, conf:conf,
          sev:severity(dm.drift), changes:dm.changes, comps:comps};
}

/* ---------- what the pages say ---------- */

// A fingerprint of how a character is actually written, taken from the script.
function scriptPrint(api, name){
  var blocks = api.blocks(), scenes = api.scenes();
  var speeches = [], sceneNos = [], withWhom = {};
  var cue = function(t){ return String(t || "").replace(/\*|_/g, "").replace(/\s*\(.*$/, "").trim().toUpperCase(); };

  scenes.forEach(function(sc){
    var ids = {}; sc.ids.forEach(function(id){ ids[id] = 1; });
    var here = blocks.filter(function(b){ return ids[b.id]; });
    var cast = {}, mine = false;
    here.forEach(function(b, i){
      if(b.type !== "Character") return;
      var who = cue(b.text);
      if(!who) return;
      cast[who] = 1;
      if(who !== name) return;
      mine = true;
      var lines = [];
      for(var j = i + 1; j < here.length; j++){
        if(here[j].type === "Dialogue") lines.push(here[j].text);
        else if(here[j].type !== "Parenthetical") break;
      }
      if(lines.length) speeches.push({page:sc.page, scene:sc.n, text:lines.join(" ")});
    });
    if(mine){
      sceneNos.push(sc.n);
      Object.keys(cast).forEach(function(w){ if(w !== name) withWhom[w] = (withWhom[w] || 0) + 1; });
    }
  });

  var all = speeches.map(function(s){ return s.text; }).join(" ");
  var plain = all.replace(/\[\[[\s\S]*?\]\]/g, "").replace(/[*_]/g, "");
  var words = plain.toLowerCase().match(/[a-z'\u2019]+/g) || [];
  // Distinctive words only. Anything short is function words that every
  // character uses, and they would swamp the comparison.
  var vocab = {};
  words.forEach(function(w){ if(w.length > 4) vocab[w] = 1; });

  return {
    name:name, speeches:speeches.length, words:words.length,
    scenes:sceneNos, first:speeches.length ? speeches[0].page : 0,
    last:speeches.length ? speeches[speeches.length-1].page : 0,
    avg: speeches.length ? Math.round(words.length / speeches.length) : 0,
    vocab:Object.keys(vocab).sort(),
    withWhom:withWhom,
    longest: speeches.slice().sort(function(a,b){ return b.text.length - a.text.length; }).slice(0,3)
  };
}

// Movement in the writing since the baseline was locked. Reported on its own,
// never mixed into the capsule's continuity number.
function scriptMovement(then, now){
  if(!then || !now) return null;
  var a = {}, shared = 0;
  then.vocab.forEach(function(w){ a[w] = 1; });
  now.vocab.forEach(function(w){ if(a[w]) shared++; });
  var union = then.vocab.length + now.vocab.length - shared;
  var vocabMove = union ? 1 - shared / union : 0;
  var fresh = now.vocab.filter(function(w){ return !a[w]; });
  return {
    vocabMove: vocabMove,
    speeches: now.speeches - then.speeches,
    words: now.words - then.words,
    avgThen: then.avg, avgNow: now.avg,
    scenes: now.scenes.length - then.scenes.length,
    fresh: fresh.slice(0, 12)
  };
}

/* ---------- panel ---------- */

WB.register({
  id: "character-capsule",
  name: "Capsules",
  version: "1.0",
  mount: function(host, api){
    var cap = null, baseline = null, printAtLock = null, editor = null;

    function lib(){
      try{ return JSON.parse(localStorage.getItem(LIB_KEY) || "[]"); }
      catch(e){ return []; }
    }
    function saveLib(l){
      try{ localStorage.setItem(LIB_KEY, JSON.stringify(l)); }
      catch(e){ api.toast("This browser will not keep the capsule library."); }
    }
    function stash(){
      if(!cap || !cap.character_name) return;
      var l = lib(), i = -1;
      l.forEach(function(x, n){ if(x.capsule_id === cap.capsule_id) i = n; });
      var snap = JSON.parse(JSON.stringify(cap));
      snap._baseline = baseline;
      snap._script_baseline = printAtLock;
      if(i >= 0) l[i] = snap; else l.push(snap);
      saveLib(l);
    }
    function open(record){
      cap = JSON.parse(JSON.stringify(record));
      baseline = cap._baseline || null;
      printAtLock = cap._script_baseline || null;
      delete cap._baseline; delete cap._script_baseline; delete cap._score;
      draw();
    }
    function esc(s){ return String(s == null ? "" : s)
      .replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
    var pct = function(n){ return Math.round(n * 100) + "%"; };

    /* --- the six-segment ring --- */
    function ring(s){
      var cx = 55, cy = 55, r = 40, keys = Object.keys(WEIGHTS), step = 360 / keys.length, out = "";
      function polar(rad, deg){ var a = (deg - 90) * Math.PI / 180;
        return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; }
      function arc(rad, a0, a1){
        var p0 = polar(rad, a0), p1 = polar(rad, a1);
        return "M" + p0[0].toFixed(1) + " " + p0[1].toFixed(1) +
               " A" + rad + " " + rad + " 0 " + (a1 - a0 > 180 ? 1 : 0) + " 1 " +
               p1[0].toFixed(1) + " " + p1[1].toFixed(1);
      }
      keys.forEach(function(k, i){
        var a0 = i * step + 2, a1 = (i + 1) * step - 2;
        var fill = a0 + (a1 - a0) * s.comps[k];
        out += '<path d="' + arc(r, a0, a1) + '" stroke="#3d4753" stroke-width="7" fill="none" stroke-linecap="round"/>';
        if(s.comps[k] > 0.01)
          out += '<path d="' + arc(r, a0, fill) + '" stroke="#c8892f" stroke-width="7" fill="none" stroke-linecap="round"/>';
      });
      out += '<text x="55" y="52" text-anchor="middle" fill="#fff" font-size="17" font-family="system-ui" font-weight="600">' +
             pct(s.conf) + '</text>';
      out += '<text x="55" y="65" text-anchor="middle" fill="#8794a3" font-size="7.5" font-family="system-ui" letter-spacing="1">CONFIDENCE</text>';
      return '<svg viewBox="0 0 110 110" style="width:110px;height:110px;display:block;margin:0 auto">' + out + "</svg>";
    }

    /* --- section editor --- */
    function ensureEditor(){
      if(editor) return editor;
      editor = document.createElement("dialog");
      editor.className = "wide";
      editor.style.maxWidth = "min(94vw,560px)";
      editor.innerHTML = '<h2 id="cc-sec-title">Section</h2><div class="inner" id="cc-sec-body"></div>' +
        '<footer><button id="cc-sec-close">Close</button></footer>';
      document.body.appendChild(editor);
      editor.querySelector("#cc-sec-close").onclick = function(){ editor.close(); };
      return editor;
    }
    function editSection(sec){
      var d = ensureEditor();
      d.querySelector("#cc-sec-title").textContent = sec.label;
      var body = d.querySelector("#cc-sec-body");
      body.textContent = "";

      function listBox(label, get, set, hint){
        var wrap = document.createElement("div");
        wrap.innerHTML = '<label class="note-sm" style="display:block;margin-bottom:4px;color:#fff">' +
          esc(label) + ' <span style="color:var(--chrome-dim);font-weight:400">' + (hint || "one per line") + '</span></label>';
        var ta = document.createElement("textarea");
        ta.rows = 4;
        ta.style.cssText = "width:100%;background:#2b333d;border:1px solid var(--rule);border-radius:4px;" +
          "padding:7px;resize:vertical;font-family:system-ui,sans-serif;line-height:1.45";
        ta.value = (get() || []).join("\n");
        ta.oninput = function(){
          set(ta.value.split("\n").map(function(x){ return x.trim(); }).filter(Boolean));
          draw();
        };
        wrap.appendChild(ta);
        body.appendChild(wrap);
      }

      if(sec.flatlist){
        listBox("Relationships",
          function(){ return cap.relationships; },
          function(v){ cap.relationships = v; },
          "one per line, e.g. Sheriff Doyle: rival");
      } else {
        sec.fields.forEach(function(f){
          if(f.t === "list"){
            listBox(f.label,
              function(){ return cap[sec.key][f.k]; },
              function(v){ cap[sec.key][f.k] = v; });
            return;
          }
          var wrap = document.createElement("div");
          if(f.t === "bool"){
            wrap.style.cssText = "display:flex;align-items:center;gap:9px";
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.style.width = "auto";
            cb.checked = !!cap[sec.key][f.k];
            cb.onchange = function(){ cap[sec.key][f.k] = cb.checked; draw(); };
            var lb = document.createElement("label");
            lb.textContent = f.label;
            lb.style.color = "#fff";
            wrap.appendChild(cb); wrap.appendChild(lb);
          } else {
            wrap.innerHTML = '<label class="note-sm" style="display:block;margin-bottom:4px;color:#fff">' + esc(f.label) + "</label>";
            var inp = document.createElement("input");
            inp.type = "text";
            inp.style.width = "100%";
            inp.value = cap[sec.key][f.k] || "";
            inp.oninput = function(){ cap[sec.key][f.k] = inp.value; draw(); };
            wrap.appendChild(inp);
          }
          body.appendChild(wrap);
        });
      }
      d.showModal();
    }

    /* --- seed from the script --- */
    function seed(name){
      var p = scriptPrint(api, name);
      var c = blank();
      c.character_name = name;
      c.story.timeline_anchors = p.speeches
        ? ["first speaks p." + p.first, "last speaks p." + p.last, p.scenes.length + " scenes"]
        : [];
      c.voice.sample_refs = p.longest.map(function(s){ return "p." + s.page + " sc." + s.scene; });
      c.relationships = Object.keys(p.withWhom)
        .sort(function(a,b){ return p.withWhom[b] - p.withWhom[a]; })
        .slice(0, 8)
        .map(function(w){
          var n = p.withWhom[w];
          return w + ": shares " + n + (n === 1 ? " scene" : " scenes");
        });
      return c;
    }

    /* --- rail --- */
    function draw(){
      var cast = api.reports().cast;
      var l = lib();
      var have = {};
      l.forEach(function(x){ have[(x.character_name || "").toUpperCase()] = x; });

      if(!cap){
        host.innerHTML =
          '<p class="note-hint" style="padding:0 0 6px">Everyone who speaks. Open one to build a capsule, ' +
          'or pick up a capsule you already made.</p>' +
          (cast.length
            ? '<div id="cc-cast"></div>'
            : '<p class="note-hint" style="padding:0">Nobody has spoken yet.</p>') +
          '<div style="display:grid;gap:6px;margin-top:9px">' +
            '<button id="cc-import">Import a capsule\u2026</button></div>';
        var box = host.querySelector("#cc-cast");
        if(box) cast.forEach(function(c){
          var rec = have[c.name];
          var conf = rec ? (rec._baseline ? "capsule, locked" : "capsule") : "";
          var row = document.createElement("div");
          row.className = "castrow";
          row.style.padding = "5px 0";
          row.innerHTML = '<span><b style="color:#dfe6ee">' + esc(c.name) + "</b>" +
            '<span class="note-sm"> ' + c.speeches + " speeches</span></span>" +
            '<span style="color:' + (rec ? "#c8892f" : "var(--chrome-dim)") + '">' + conf + "</span>";
          row.onclick = function(){ rec ? open(rec) : open(seed(c.name)); };
          host.querySelector("#cc-cast").appendChild(row);
        });
        host.querySelector("#cc-import").onclick = importCapsule;
        return;
      }

      var s = scoreAll(cap, baseline);
      var now = scriptPrint(api, (cap.character_name || "").toUpperCase());
      var move = baseline ? scriptMovement(printAtLock, now) : null;

      host.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<button id="cc-back" style="padding:2px 7px">\u2190</button>' +
          '<b style="color:#fff;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            esc(cap.character_name || "(unnamed)") + "</b></div>" +
        '<p class="note-hint" style="padding:4px 0 2px">' +
          (baseline ? (s.changes.length ? "Changed since you locked it: " + esc(s.changes.map(function(k){
              var sec = SECTIONS.filter(function(x){ return x.key === k; })[0]; return sec ? sec.label : k; }).join(", ")) + "."
            : "Nothing has changed since you locked it.") : "Not locked. Lock it once the character is set, and changes show here.") + "</p>" +
        (cap.constraints && cap.constraints.consent_required && cap.constraints.synthetic_generation_allowed
          ? '<p class="note-hint" style="padding:2px 0;color:#c8892f">Consent is required, and synthetic generation is allowed. Check that is what you mean.</p>' : "") +
        '<p class="note-hint" style="padding:8px 0 3px">Sections</p><div id="cc-secs"></div>' +
        (move ? movementBlock(move) : "") +
        '<div style="display:grid;gap:6px;margin-top:10px">' +
          '<button id="cc-seed">Refresh from the script</button>' +
          '<button id="cc-lock">' + (baseline ? "Re-lock the baseline" : "Lock baseline") + "</button>" +
          (baseline ? '<button id="cc-unlock">Clear the baseline</button>' : "") +
          '<button id="cc-save">Save to library</button>' +
          '<button id="cc-export">Export capsule</button>' +
        "</div>";

      var secs = host.querySelector("#cc-secs");
      SECTIONS.forEach(function(sec){
        var fl = filled(sec);
        var row = document.createElement("div");
        row.className = "castrow";
        row.style.cssText = "padding:4px 0;gap:8px";
        row.innerHTML = '<span style="flex:1">' + esc(sec.label) + "</span>" +
          '<span style="color:' + (fl.have ? "#dfe6ee" : "var(--chrome-dim)") + '">' + esc(fl.text) + "</span>";
        row.onclick = function(){ editSection(sec); };
        secs.appendChild(row);
      });

      host.querySelector("#cc-back").onclick = function(){ stash(); cap = null; draw(); };
      host.querySelector("#cc-seed").onclick = function(){
        var fresh = seed((cap.character_name || "").toUpperCase());
        cap.story.timeline_anchors = fresh.story.timeline_anchors;
        cap.voice.sample_refs = fresh.voice.sample_refs;
        cap.relationships = fresh.relationships;
        draw();
        api.toast("Anchors, samples and relationships taken from the script.");
      };
      host.querySelector("#cc-lock").onclick = function(){
        baseline = JSON.parse(JSON.stringify(cap));
        printAtLock = scriptPrint(api, (cap.character_name || "").toUpperCase());
        stash(); draw();
        api.toast("Baseline locked. Drift is measured from here.");
      };
      if(baseline) host.querySelector("#cc-unlock").onclick = function(){
        baseline = null; printAtLock = null; stash(); draw();
        api.toast("Baseline cleared.");
      };
      host.querySelector("#cc-save").onclick = function(){
        stash(); api.toast("Saved. The standalone builder can see it too.");
      };
      host.querySelector("#cc-export").onclick = exportCapsule;
    }

    // what is written in a section, counted, not scored
    function filled(sec){
      if(sec.flatlist){ var n = (cap.relationships || []).filter(function(x){ return String(x).trim(); }).length;
        return {have:n, text: n ? n + (n === 1 ? " written" : " written") : "empty"}; }
      var have = sec.fields.filter(function(f){ var v = cap[sec.key][f.k];
        return f.t === "bool" ? false : Array.isArray(v) ? v.some(function(x){ return String(x).trim(); }) : !!String(v || "").trim(); });
      var of = sec.fields.filter(function(f){ return f.t !== "bool"; }).length;
      return {have:have.length, text: of ? have.length + " of " + of + " filled" : "yes/no"};
    }
    function mrow(k, v){
      return '<div><span>' + k + '</span><b>' + v + "</b></div>";
    }
    function movementBlock(m){
      var band = m.vocabMove <= 0.25 ? "#4f9d69" : m.vocabMove <= 0.5 ? "#c8892f" : "#c25a4e";
      var bits = [];
      if(m.speeches) bits.push((m.speeches > 0 ? "+" : "") + m.speeches + " speeches");
      if(m.words) bits.push((m.words > 0 ? "+" : "") + m.words + " words");
      if(m.scenes) bits.push((m.scenes > 0 ? "+" : "") + m.scenes + " scenes");
      if(m.avgThen !== m.avgNow) bits.push("speech length " + m.avgThen + " \u2192 " + m.avgNow);
      return '<p class="note-hint" style="padding:9px 0 3px">On the page, since the lock</p>' +

        (bits.length ? '<p class="note-hint" style="padding:3px 0 0">' + esc(bits.join(" \u00b7 ")) + "</p>" : "") +
        (m.fresh.length ? '<p class="note-hint" style="padding:2px 0 0;font-style:italic">new words: ' +
          esc(m.fresh.slice(0,8).join(", ")) + "</p>" : "");
    }

    function exportCapsule(){
      var s = scoreAll(cap, baseline);
      var out = JSON.parse(JSON.stringify(cap));
      out._score = {
        readiness_score:+s.readiness.toFixed(4), continuity_score:+s.cont.toFixed(4),
        drift_score:+s.drift.toFixed(4), risk_score:+s.risk.toFixed(4),
        capsule_confidence:+s.conf.toFixed(4), severity: baseline ? s.sev : "Stable"
      };
      var b = new Blob([JSON.stringify(out, null, 2)], {type:"application/json"});
      var a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = (cap.character_name || "capsule").replace(/\s+/g, "_") + ".capsule.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 3000);
      api.toast("Exported.");
    }
    function importCapsule(){
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = ".json,application/json";
      inp.onchange = function(){
        var f = inp.files[0]; if(!f) return;
        f.text().then(function(t){
          try{
            var o = JSON.parse(t);
            delete o._score;
            open(Object.assign(blank(), o));
            api.toast("Imported " + (cap.character_name || "capsule") + ".");
          }catch(e){ api.toast("That is not capsule JSON."); }
        });
      };
      inp.click();
    }

    api.onChange(function(){ if(!cap) draw(); });
    draw();
  }
});

if(typeof module !== "undefined" && module.exports)
  module.exports = {blank:blank, scoreAll:scoreAll, readiness:readiness, risk:risk,
                    comp:comp, severity:severity, continuity:continuity, driftMetrics:driftMetrics,
                    scriptPrint:scriptPrint, scriptMovement:scriptMovement, SECTIONS:SECTIONS, WEIGHTS:WEIGHTS};
})();
