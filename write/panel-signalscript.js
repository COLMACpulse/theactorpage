/*
  SignalScript — a panel for Writers Blockage.

  Turns raw speech into readable writing without flattening the voice.
  Ported from SignalScript v2. The doctrine is unchanged:

    RAW is exact and immutable. It goes to the ledger, never over the script.
    CLEAN removes filler and stabilises mechanics. It never rewrites,
      reorders or paraphrases.
    CALIBRATED adds severity flags and alternatives. Nothing is auto-softened.
    The user decides what lands.

  No network. No AI. Everything happens on this machine.
*/
(function(){
"use strict";

/* ---------- configuration, carried over verbatim ---------- */

var FILLER_PHRASES = ["you know what i mean","if that makes sense","at the end of the day",
  "to be honest with you","i guess","i mean","you know","kind of","sort of","basically",
  "actually","literally"];

var AMBIGUOUS = {actually:1, literally:1};   // can carry meaning; counted, never cut

var FILLER_WORDS = ["ummm","umm","um","uhh","uh","erm","er"];

var SEVERITY = {
  always:["frequently","consistently","in this case"],
  never:["rarely","not yet","not in the observed cases"],
  absolutely:["clearly","strongly","under the current conditions"],
  impossible:["not currently feasible","unsupported by the evidence","highly constrained"],
  unacceptable:["outside tolerance","not workable","misaligned with the requirement"],
  everything:["most elements","the relevant elements","the full observed set"],
  nothing:["no observed evidence","very little","none of the relevant items"],
  huge:["substantial","high-impact","large relative to baseline"],
  massive:["substantial","system-wide","large in magnitude"],
  terrible:["low-quality","ineffective","materially below baseline"],
  perfect:["fit for the current purpose","high-confidence","complete under the stated criteria"],
  completely:["substantially","to the observed extent","under the current scope"],
  totally:["substantially","clearly","under this interpretation"],
  obviously:["the evidence suggests","apparently","under the stated assumptions"],
  everyone:["many people","the observed group","most participants"],
  nobody:["no observed participant","very few people","none in the current sample"],
  best:["highest-scoring","preferred","strongest under the current criteria"],
  worst:["lowest-scoring","least effective","weakest under the current criteria"]
};

// Profanity and idiom are identity. They are protected, and their survival
// is what the voice-preservation number measures.
var PROTECTED = ["fuck","fucking","shit","dude","bro","man","yo","homie","dig",
                 "motherfucker","bitchin"];

var WORD_RE = /[\wâ€™'\u2019-]+/g;
function words(t){ return String(t || "").match(WORD_RE) || []; }
function clamp(v, lo, hi){ lo = lo === undefined ? 0 : lo; hi = hi === undefined ? 1 : hi;
  return Math.max(lo, Math.min(hi, v)); }
function esc(t){ return String(t).replace(/[&<>]/g, function(m){
  return {"&":"&amp;","<":"&lt;",">":"&gt;"}[m]; }); }
function rx(t){ return String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/* ---------- the engine ---------- */

function clean(text, opt){
  var edits = [], removed = 0, ambiguous = 0;
  var cur = String(text || "");

  function note(kind, original, replacement, reason){
    if(edits.length < 4000) edits.push({kind:kind, original:original, replacement:replacement, reason:reason});
  }

  // Caption and transcript scaffolding, before anything else touches the words.
  if(opt.structure){
    cur = cur.replace(/^\s*\d+\s*$/gm, function(m){ note("index", m, "", "caption index"); return ""; });
    cur = cur.replace(/\d{1,2}:\d{2}(?::\d{2})?[.,]?\d{0,3}\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?[.,]?\d{0,3}.*$/gm,
      function(m){ note("timestamp", m, "", "caption timing"); return ""; });
    cur = cur.replace(/[\[(]?\b\d{1,2}:\d{2}(?::\d{2})?\b[\])]?/g,
      function(m){ note("timestamp", m, "", "inline timestamp"); return ""; });
    cur = cur.replace(/^WEBVTT.*$/gm, "");
  }
  if(opt.speakers){
    cur = cur.replace(/^[ \t]*([A-Z][A-Za-z .'\-]{0,28}|SPEAKER ?\d+)\s*:[ \t]*/gm,
      function(m){ note("speaker", m, "", "speaker label"); return ""; });
  }
  if(opt.brackets){
    cur = cur.replace(/[\[(]\s*(laughs?|laughter|inaudible|crosstalk|sighs?|pause|coughs?|music|applause|unintelligible|silence)[^\])]*[\])]/gi,
      function(m){ note("bracket", m, "", "stage direction"); return ""; });
  }

  if(opt.fillers){
    var fw = new RegExp("\\b(?:" + FILLER_WORDS.map(rx).join("|") + ")\\b[,\\s]*", "gi");
    cur = cur.replace(fw, function(m){ removed++; note("filler", m, "", "hesitation sound"); return ""; });

    FILLER_PHRASES.forEach(function(p){
      var re = new RegExp("(?:^|\\b)" + rx(p) + "\\b[,\\s]*", "gi");
      if(AMBIGUOUS[p]){
        if(!opt.aggressive){ ambiguous += (cur.match(re) || []).length; return; }
      }
      cur = cur.replace(re, function(m){
        removed += words(p).length || 1;
        note("filler_phrase", m, "", "spoken scaffolding");
        return "";
      });
    });
  }

  if(opt.repeats){
    // Repetition cannot be judged by how many times it happens. "No no no"
    // is a choice and "the the" is a stutter, at the same count. So only the
    // short function words people actually trip over are collapsed, and
    // every content word is left exactly as it was said.
    var STUMBLE = "i|i'm|the|a|an|it|it's|is|was|and|but|to|of|that|that's|this|there's|" +
                  "he|she|they|we|you|my|so|in|on|at|for|with|his|her|their";
    var pair = new RegExp("\\b(" + STUMBLE + ")([,\\s]+\\1\\b)+", "gi");
    cur = cur.replace(pair, function(m, w){ note("duplicate", m, w, "immediate repetition"); return w; });

    // A phrase restarted after a dash is a false start, however long it is.
    var restart = /\b([\w'\u2019]+(?:\s+[\w'\u2019]+){0,6})\s*[\u2014\u2013-]{1,2}\s*\1\b/gi;
    var guard = 0;
    while(restart.test(cur) && guard++ < 6)
      cur = cur.replace(restart, function(m, w){ note("false_start", m, w, "false start"); return w; });
  }

  if(opt.mechanics){
    var before = cur;
    cur = cur.replace(/[ \t]+/g, " ")
             .replace(/\s+([,.;:!?])/g, "$1")
             .replace(/,\s*,+/g, ", ")
             .replace(/,\s*([.!?])/g, "$1")   // a cut phrase can leave "fridge,." behind
             .replace(/([.!?]){2,}/g, "$1")
             .replace(/\n[ \t]+/g, "\n")
             .replace(/[ \t]+\n/g, "\n")
             .replace(/\n{3,}/g, "\n\n")
             .trim();
    if(cur !== before) note("spacing", before, cur, "punctuation and whitespace");
    cur = capitalise(cur, note);
  }
  if(opt.merge) cur = cur.replace(/([^.!?\n])\n(?!\n)/g, "$1 ").replace(/[ \t]{2,}/g, " ");

  return {text:cur, edits:edits, removed:removed,
          ambiguity: clamp(ambiguous / Math.max(words(text).length, 1))};
}

function capitalise(text, note){
  var chars = String(text).split(""), next = true, changed = false;
  for(var i = 0; i < chars.length; i++){
    var c = chars[i];
    if(next && /[a-zA-Z]/.test(c)){
      var up = c.toUpperCase();
      if(up !== c){ chars[i] = up; changed = true; }
      next = false;
    } else if(c === "." || c === "!" || c === "?" || c === "\n"){
      // A full stop between digits is a decimal, not a sentence.
      if(c === "." && /\d/.test(chars[i-1] || "") && /\d/.test(chars[i+1] || "")) continue;
      next = true;
    }
  }
  var out = chars.join("");
  if(changed && note) note("capitalization", text, out, "sentence starts");
  return out;
}

function severityFlags(text){
  var flags = [], sentences = String(text || "").split(/(?<=[.!?])\s+/), offset = 0;
  sentences.forEach(function(sentence){
    Object.keys(SEVERITY).forEach(function(term){
      var re = new RegExp("\\b" + rx(term) + "\\b", "gi"), m;
      while((m = re.exec(sentence))){
        flags.push({term:m[0], sentence:sentence.trim(),
                    suggestions:SEVERITY[term], index:offset + m.index});
      }
    });
    offset += sentence.length + 1;
  });
  return flags.sort(function(a, b){ return a.index - b.index; });
}

function renderCalibrated(cleanText, flags){
  if(!flags.length) return cleanText + "\n\n[No severity terms flagged.]";
  var out = [cleanText, "", "SEVERITY FLAGS"];
  flags.forEach(function(f, i){
    out.push((i+1) + ". [" + f.term + "] alternatives: " + f.suggestions.join("; "));
  });
  return out.join("\n");
}

function metrics(raw, cleanText, edits, removed, flags, ambiguity){
  var rw = words(raw).length, cw = words(cleanText).length;
  var prot = {}; PROTECTED.forEach(function(p){ prot[p] = 1; });
  function count(t){ return words(String(t).toLowerCase()).filter(function(w){ return prot[w]; }).length; }
  var rm = count(raw), cm = count(cleanText);
  var voice = rm === 0 ? 1 : clamp(cm / rm);
  var pressure = edits.length / Math.max(rw, 1);
  var r = function(n){ return Math.round(n * 10000) / 10000; };
  return {
    raw_words:rw, clean_words:cw, fillers_removed:removed,
    severity_terms:flags.length, edits:edits.length,
    filler_density:r(removed / Math.max(rw, 1)),
    severity_density:r(flags.length / Math.max(cw, 1)),
    compression_ratio:r(clamp(1 - cw / Math.max(rw, 1), -1, 1)),
    voice_preservation:r(voice),
    edit_pressure:r(pressure),
    ambiguity:r(ambiguity),
    calibration_confidence:r(clamp(1 - 0.55 * pressure - 0.25 * ambiguity + 0.20 * voice))
  };
}

// The contract: raw in, ProcessResult out.
function process(text, opt){
  var raw = String(text || "");
  var c = clean(raw, opt);
  var flags = opt.severity ? severityFlags(c.text) : [];
  return {
    raw: raw,
    clean: c.text,
    calibrated: renderCalibrated(c.text, flags),
    edits: c.edits,
    severity_flags: flags,
    metrics: metrics(raw, c.text, c.edits, c.removed, flags, c.ambiguity)
  };
}

var LEVELS = {
  light:    {fillers:1, aggressive:0, repeats:1, structure:1, speakers:0, brackets:1, mechanics:1, merge:0, severity:1},
  standard: {fillers:1, aggressive:0, repeats:1, structure:1, speakers:0, brackets:1, mechanics:1, merge:1, severity:1},
  heavy:    {fillers:1, aggressive:1, repeats:1, structure:1, speakers:1, brackets:1, mechanics:1, merge:1, severity:1}
};

/* ---------- the panel ---------- */

WB.register({
  id: "signalscript",
  name: "SignalScript",
  version: "2.0",
  mount: function(host, api){
    var result = null;

    host.innerHTML =
      '<div style="display:grid;gap:8px">' +
        '<p class="note-hint" style="padding:0">Paste dictation, an interview or a transcript. ' +
        'Your exact words are kept in the change trail; only what you choose reaches the script. ' +
        'Talking a scene? Use Voice instead: it writes as you speak.</p>' +
        '<textarea id="ss-in" rows="7" spellcheck="true" placeholder="Paste raw speech here\u2026" ' +
          'style="width:100%;background:#2b333d;border:1px solid var(--rule);border-radius:4px;' +
          'padding:8px;resize:vertical;font-family:system-ui,sans-serif;line-height:1.5"></textarea>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<select id="ss-level" style="flex:1"><option value="light">Light</option>' +
          '<option value="standard" selected>Standard</option><option value="heavy">Heavy</option></select>' +
          '<button id="ss-file">File\u2026</button>' +
        '</div>' +
        '<button id="ss-go" style="background:var(--mark);border-color:var(--mark);color:#1b1206;font-weight:600">' +
          'Clean the signal</button>' +
        '<div id="ss-out"></div>' +
      '</div>';

    var input = host.querySelector("#ss-in");

    host.querySelector("#ss-file").onclick = function(){
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = ".txt,.srt,.vtt,.md";
      inp.onchange = function(){
        var f = inp.files[0]; if(!f) return;
        f.text().then(function(t){ input.value = t; api.toast("Loaded " + f.name); });
      };
      inp.click();
    };

    host.querySelector("#ss-go").onclick = function(){
      var raw = input.value;
      if(!raw.trim()){ api.toast("Nothing to clean yet."); return; }
      result = process(raw, LEVELS[host.querySelector("#ss-level").value]);
      draw();
    };

    function pct(n){ return Math.round(n * 100) + "%"; }

    function draw(){
      var m = result.metrics, out = host.querySelector("#ss-out");
      var flags = result.severity_flags.slice(0, 6);
      out.innerHTML =
        '<div class="statgrid" style="padding:0;margin:6px 0 8px">' +
          row("Words in", m.raw_words) + row("Words out", m.clean_words) +
          row("Fillers cut", m.fillers_removed) +
          row("Changes made", m.edits) +
        '</div>' +
        '<div style="background:#2b333d;border:1px solid var(--rule);border-radius:4px;padding:8px;' +
          'max-height:190px;overflow:auto;font-family:system-ui,sans-serif;line-height:1.5;white-space:pre-wrap">' +
          esc(result.clean) + '</div>' +
        (flags.length
          ? '<p class="note-hint" style="padding:6px 0 2px">' + result.severity_flags.length +
            ' severity term' + (result.severity_flags.length === 1 ? "" : "s") +
            ' flagged, not changed:</p><div class="note-hint" style="padding:0">' +
            flags.map(function(f){ return "\u2022 <b>" + esc(f.term) + "</b>: " +
              esc(f.suggestions.slice(0,2).join("; ")); }).join("<br>") + '</div>'
          : '<p class="note-hint" style="padding:6px 0 0">No severity terms flagged.</p>') +
        '<div style="display:grid;gap:6px;margin-top:9px">' +
          '<button id="ss-insert">Insert into the script</button>' +
          '<button id="ss-replace">Replace what is selected</button>' +
          '<button id="ss-copy">Copy the clean text</button>' +
        '</div>';

      out.querySelector("#ss-insert").onclick = function(){
        api.applyResult(result, {tool:"SignalScript", scope:"block", insert:true});
        api.toast("Placed " + result.metrics.clean_words + " words. Your raw take is in the trail.");
      };
      out.querySelector("#ss-replace").onclick = function(){
        if(!api.selection()){ api.toast("Select the elements to replace first."); return; }
        api.applyResult(result, {tool:"SignalScript", scope:"selection", as:"blocks"});
        api.toast("Replaced. Undo puts it back.");
      };
      out.querySelector("#ss-copy").onclick = function(){
        navigator.clipboard.writeText(result.clean)
          .then(function(){ api.toast("Copied."); })
          .catch(function(){ api.toast("Copy failed."); });
      };
    }

    function row(label, value){
      return '<div><span>' + label + '</span><b>' + value + '</b></div>';
    }
  }
});

// Exposed so the engine can be tested on its own, away from the panel.
if(typeof module !== "undefined" && module.exports)
  module.exports = {process:process, clean:clean, severityFlags:severityFlags, metrics:metrics, LEVELS:LEVELS};
})();
