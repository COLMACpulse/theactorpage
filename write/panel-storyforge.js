/*
  StoryForge — a panel for Writers Blockage.

  Treatment-first. One character, one ethos, one genre, one world, plus cast
  pressure, compressed into a Treatment Genome that the season expands from.

  The scoring is carried over exactly as v0.7 computes it, so the numbers here
  and the numbers in the standalone app agree. Three of those numbers do not
  measure what their names say, and the panel says so rather than presenting
  them as analysis. See NOTE ON THE NUMBERS below.

  What is added is the half StoryForge specified but could never run:

      ContinuityBreak if distance(ExpectedState, DraftState) > θ

  There was no DraftState before. Here the script is right there, so the
  watchdog compares the plan against the pages instead of against nothing.
*/
(function(){
"use strict";

var clamp = function(x){ return Math.max(0, Math.min(1, x)); };
var words = function(s){ return String(s || "").trim().split(/\s+/).filter(Boolean); };
var lines = function(s){ return String(s || "").split(/\n+/).map(function(x){ return x.trim(); }).filter(Boolean); };
function esc(s){ return String(s == null ? "" : s)
  .replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

/* ---------- scoring ----------

  The v0.7 code scored by counting words. The v0.7 math doc specifies the
  vectors by their named components. What follows implements the doc:

    C = [goal, fear, flaw, gift, wound, need, voice]
    E = [value, rule, taboo, moral_pressure, decision_bias]
    G = [tone, realism, stakes, pacing, violence, humor, mystery, allowed_events]
    W = [location, rules, culture, scarcity, pressure, history, visual_identity]
    K = Sigma interaction(C_main, C_i), where
        P_i = goal_conflict + value_conflict + secret_pressure
              + relationship_history + utility_to_story

  A vector now scores by how many of its named slots are actually present,
  so padding the input cannot raise it, and every score can name what is
  missing instead of only reporting a number.

  Detection is keyword-based, which is a heuristic and is described as one.
  It answers "did you say anything about the wound", not "is the wound good".
  The weights, the gold-zone curve and the adjusted-score formula are
  unchanged from v0.7.
*/

var SLOTS = {
  character: {
    goal:/\bgoal|wants?\b|needs? to|trying to|mission|objective|set on|after\b|keep the|protect/i,
    fear:/\bfear|afraid|terrified|dread|scared|worries|horror of/i,
    flaw:/\bflaw|weakness|blind ?spot|can'?t stop|too \w+|control\b|pride|denial|addict/i,
    gift:/\bgift|talent|good at|skill|knack|sees\b|reads people|genius|useful/i,
    wound:/\bwound|scar|lost\b|grief|betrayed|damage|broke|buried|what happened to/i,
    need:/\bneed\b|must learn|has to accept|really needs|lesson|truly wants/i,
    voice:/\bvoice|speaks|blunt|dry\b|terse|laconic|verbose|accent|talks|never explains|says little/i
  },
  ethos: {
    value:/\bvalue|matters?|believe|honou?r|loyal|family|truth|justice|decency/i,
    rule:/\brule|always|must\b|code\b|law\b|the work|you do\b/i,
    taboo:/\bnever\b|forbidden|won'?t\b|refuse|crosses? the line|no one\b|off limits/i,
    moral_pressure:/\bcost|price|sacrific|choose|betray|compromis|guilt|shame|debt/i,
    decision_bias:/\bbias|tends? to|default|first instinct|would rather|prefers?|usually|hiding inside/i
  },
  genre: {
    tone:/\btone|dark|light|grounded|absurd|grim|warm|dry|bleak|comic|serious/i,
    realism:/\brealis|grounded|heighten|surreal|naturalis|fantas|magical|mythic/i,
    stakes:/\bstake|life|death|surviv|ruin|lose everything|risk|danger/i,
    pacing:/\bpace|pacing|slow|fast|propuls|meander|tight|patient|relentless/i,
    violence:/\bviolen|blood|fight|gun|kill|brutal|bloodless|no violence/i,
    humor:/\bhumou?r|comed|comic|funny|wry|joke|absurd|deadpan/i,
    mystery:/\bmyster|secret|puzzle|reveal|whodunit|unknown|question|withheld/i,
    allowed_events:/\bno \w+|never\b|allowed|forbidden|only\b|nothing supernatural|rules? of/i
  },
  world: {
    location:/\b(town|city|ranch|desert|station|island|county|border|valley|coast|kingdom|street|house|farm|ship|road|camp|frontier)\b/i,
    rules:/\brule|law\b|code\b|custom|forbidden|must\b|cannot|the way things/i,
    culture:/\bcultur|communit|people|religio|tradition|class\b|famil|clan|church|neighbou?r/i,
    scarcity:/\bscarc|short of|debt|money|water|food|poor|dwindl|lack|nothing left|resource/i,
    pressure:/\bpressure|threat|encroach|loom|closing in|deadline|drought|weather|coming for/i,
    history:/\bhistor|past\b|old\b|years|ago\b|legacy|founded|ruins|war\b|used to/i,
    visual_identity:/\bgrey|gray|red\b|colou?r|dust|light\b|palette|looks? like|visual|texture|volatile/i
  },
  cast: {
    goal_conflict:/\brival|against|oppos|blocks?|obstacle|competes|in the way|counterweight/i,
    value_conflict:/\bmoral|friction|challenge|disagree|conflict|questions|tests?\b/i,
    secret_pressure:/\bsecret|hides|lie|conceal|unknown|past\b|carrying/i,
    relationship_history:/\bex\b|former|old friend|brother|sister|father|mother|cousin|years|history|once\b|loyal/i,
    utility_to_story:/\bpressure|relief|counterweight|authorit|carrier|catalyst|foil|fixer|guide|muscle|voice of/i
  }
};

// Which named slots a piece of text fills, and which it leaves empty.
function slotsIn(text, group){
  var spec = SLOTS[group], hit = [], miss = [];
  Object.keys(spec).forEach(function(k){
    (spec[k].test(String(text || "")) ? hit : miss).push(k);
  });
  return {hit:hit, miss:miss, score: hit.length / Object.keys(spec).length};
}

// K = Sigma interaction(C_main, C_i). Each cast line scores its own pressure.
function castPressure(castText){
  var ls = lines(castText);
  if(!ls.length) return {score:0, per:[], miss:["no cast"]};
  var per = ls.map(function(l){
    var s = slotsIn(l, "cast");
    return {name: l.split("\u2014")[0].trim(), score:s.score, miss:s.miss};
  });
  var mean = per.reduce(function(t, p){ return t + p.score; }, 0) / per.length;
  return {score: clamp(mean), per: per,
          miss: per.filter(function(p){ return p.score < 0.4; }).map(function(p){ return p.name; })};
}

function featureVector(x){
  var C = slotsIn(x.character, "character");
  var E = slotsIn(x.ethos, "ethos");
  var G = slotsIn(x.genre + " " + x.ammo, "genre");
  var W = slotsIn(x.world, "world");
  var K = castPressure(x.cast);

  // A premise is clear when there is somebody, something they want, something
  // in the way, and somewhere it happens. Four things, present or not.
  var essentials = [
    !!(x.character || "").trim(),
    C.hit.indexOf("goal") >= 0 || C.hit.indexOf("need") >= 0,
    K.score > 0.2 || W.hit.indexOf("pressure") >= 0 || W.hit.indexOf("scarcity") >= 0,
    W.hit.indexOf("location") >= 0
  ];
  var premise = essentials.filter(Boolean).length / essentials.length;

  // Yield is pressure sources measured against the episodes they must fill.
  var sources = K.per.filter(function(p){ return p.score >= 0.4; }).length +
                ["scarcity","pressure","rules"].filter(function(k){ return W.hit.indexOf(k) >= 0; }).length;
  var need = Math.max(1, x.count || 12);
  var yield_ = clamp(sources / (need / 3));

  return {
    PremiseClarity: clamp(premise),
    CharacterDrive: clamp(C.score),
    EthosPressure: clamp(E.score),
    GenreFit: clamp(G.score),
    WorldFriction: clamp(W.score),
    CastPressure: clamp(K.score),
    EpisodeYield: yield_,
    ContinuityReadiness: clamp((K.per.length > 2 ? 0.25 : 0) + (W.score > 0.4 ? 0.25 : 0) +
                               (C.score > 0.4 ? 0.25 : 0) + (E.score > 0.4 ? 0.25 : 0)),
    _gaps: {character:C.miss, ethos:E.miss, genre:G.miss, world:W.miss, cast:K.miss},
    _essentials: {somebody:essentials[0], wants:essentials[1], opposed:essentials[2], somewhere:essentials[3]}
  };
}

/*
  Novelty. The v0.7 doc defines it as N = 1 - Similarity(Tg, ReferenceCluster),
  which needs a cluster. The v0.7 code had none and used a hash of input
  length instead. Here it is computed properly when a reference set exists,
  using the v0.6 distance math, and reported as not measured when it does not.
  Nothing is scored against an imaginary corpus.
*/
var VEC_KEYS = ["PremiseClarity","CharacterDrive","EthosPressure","GenreFit",
                "WorldFriction","CastPressure","EpisodeYield"];

var MIN_REFS = 5;
function noveltyAgainst(f, refs){
  if(!refs || refs.length < MIN_REFS) return null;
  var n = refs.length;
  var mu = {}, sig = {};
  VEC_KEYS.forEach(function(k){
    var m = refs.reduce(function(t, r){ return t + (r[k] || 0); }, 0) / n;
    mu[k] = m;
    var v = refs.reduce(function(t, r){ return t + Math.pow((r[k] || 0) - m, 2); }, 0) / n;
    // The vectors live in [0,1], so a tenth of the range is the floor. Any
    // lower and a tight cluster divides by almost nothing and every distance
    // explodes, which is how this saturated at 100% for everything.
    sig[k] = Math.max(Math.sqrt(v), 0.10);
  });
  function dist(v){
    var t = 0;
    VEC_KEYS.forEach(function(k){ t += Math.pow(((v[k] || 0) - mu[k]) / sig[k], 2); });
    return Math.sqrt(t);
  }
  var ds = refs.map(dist).sort(function(a, b){ return a - b; });
  var d95 = ds[Math.min(ds.length - 1, Math.round((ds.length - 1) * 0.95))];
  // A cluster with no spread of its own cannot say what is far from it.
  if(!(d95 > 0.6)) return {degenerate:true, refs:n};
  var d = dist(f);
  var fit = clamp(1 - d / d95);
  return {N: clamp(1 - fit), fit: fit, d: d, d95: d95, refs: n};
}

function scoreTreatment(f, refs){
  var S = 0.16*f.PremiseClarity + 0.17*f.CharacterDrive + 0.16*f.EthosPressure +
          0.12*f.GenreFit + 0.13*f.WorldFriction + 0.14*f.CastPressure + 0.12*f.EpisodeYield;
  var Q = f.ContinuityReadiness;
  var nov = noveltyAgainst(f, refs);
  if(nov && nov.degenerate) nov = null;
  var gold = null, adj;
  if(nov){
    gold = clamp(1 - Math.abs(nov.N - 0.62) / 0.62);
    adj = clamp((0.78 * S + 0.22 * gold) * (0.75 + 0.25 * Q));
  } else {
    // No cluster, so no novelty term. The remaining weight is renormalised
    // rather than filled with a number that means nothing.
    adj = clamp(S * (0.75 + 0.25 * Q));
  }
  return {TreatmentStrength:S, Novelty: nov ? nov.N : null, ClusterFit: nov ? nov.fit : null,
    GoldZone:gold, ContinuityReadiness:Q, AdjustedTreatmentScore:adj, features:f,
    refs: nov ? nov.refs : 0,
    read: adj > 0.76 ? "Greenlight treatment for episode expansion"
        : adj > 0.58 ? "Workable; improve weakest vector before full scripts"
        : "Hold: fix treatment before expansion"};
}

function extractTheme(e){
  if(/family/i.test(e)) return "Family and loyalty under pressure";
  if(/truth/i.test(e)) return "Truth revealed through action";
  if(/work/i.test(e)) return "Work as character proof";
  return "Values tested by pressure";
}
function forge(x){
  var f = featureVector(x);
  var cast = lines(x.cast).map(function(l, i){
    return {id:"CAST_" + (i+1), name:l.split("\u2014")[0].trim(),
            function: l.indexOf("\u2014") >= 0 ? l.split("\u2014").slice(1).join("\u2014").trim() : l};
  });
  var main = x.character.split("\u2014")[0].trim() || "Main Character";
  return {
    id:"TG_" + Date.now(), title:x.title, format:x.format, count:x.count,
    mainCharacter:{name:main, raw:x.character},
    ethos:x.ethos, genre:x.genre, world:x.world, cast:cast, rawAmmo:x.ammo,
    premise: main + " is forced to live the ethos: " + (x.ethos.split(".")[0] || x.ethos) +
      ". In " + (x.world.split(".")[0] || x.world) +
      ", each story pressure tests the core character against the cast and genre physics.",
    theme: extractTheme(x.ethos),
    episodeEngine:"Problem \u2192 pressure \u2192 hidden truth \u2192 practical collision \u2192 emotional cost \u2192 callback/payoff \u2192 reset with changed state.",
    seasonEngine:"Each episode solves a visible problem while opening or advancing a deeper relationship/world mystery. The finale forces the character to choose ethos over comfort.",
    endingLogic:"Endings must pay off an earlier setup, change state, and leave one controlled forward question.",
    features:f
  };
}
function expand(t, count){
  var out = [];
  count = count || t.count || 12;
  for(var i = 1; i <= count; i++){
    var phase = i === 1 ? "Pilot / ignition" : i === count ? "Finale / proof"
              : i > count * 0.66 ? "Convergence" : i > count * 0.33 ? "Escalation" : "Discovery";
    out.push({
      n:i, title:"Episode " + i + ": " + phase, phase:phase,
      a:"Visible problem generated by " + String(t.world || "").split(".")[0] + ".",
      b:"Cast pressure tests " + t.mainCharacter.name + "'s flaw/gift against the ethos.",
      guest: i % 3 === 0 ? "Necessary guest star enters as pressure carrier."
                         : "Core cast only unless plot state requires a guest."
    });
  }
  return out;
}

/*
  Episode readings. v0.7 generated hook, conflict, mystery, humour and payoff
  from the episode number alone, so every treatment produced an identical
  heatmap. These are measured from the written pages instead, and an episode
  with nothing under it reports nothing rather than a curve.
*/
function episodeReadings(episodes, api){
  var blocks = api.blocks(), scenes = api.scenes();
  var byId = {};
  blocks.forEach(function(b, i){ byId[b.id] = i; });

  // Where each episode section starts and ends in the block list.
  var marks = [];
  blocks.forEach(function(b, i){
    if(b.type !== "Section") return;
    var m = String(b.text || "").toUpperCase().match(/EPISODE\s+(\d+)/);
    if(m) marks.push({n:+m[1], at:i});
  });
  marks.sort(function(a, b){ return a.at - b.at; });

  var seen = {};
  return episodes.map(function(ep){
    var mk = marks.filter(function(m){ return m.n === ep.n; })[0];
    if(!mk) return {n:ep.n, written:false};
    var next = marks.filter(function(m){ return m.at > mk.at; })[0];
    var lo = mk.at, hi = next ? next.at : blocks.length;
    var span = blocks.slice(lo, hi);

    var sc = scenes.filter(function(s){ return byId[s.id] >= lo && byId[s.id] < hi; });
    if(!sc.length && span.filter(function(b){ return b.type !== "Section" && b.type !== "Synopsis"; })
        .every(function(b){ return !String(b.text || "").trim(); }))
      return {n:ep.n, written:false};

    var dlg = 0, act = 0, cues = {}, fresh = 0;
    span.forEach(function(b, i){
      var wc = (String(b.text || "").match(/[\w'\u2019-]+/g) || []).length;
      if(b.type === "Dialogue") dlg += wc;
      if(b.type === "Action") act += wc;
      if(b.type === "Character"){
        var who = String(b.text || "").replace(/\s*\(.*$/, "").trim().toUpperCase();
        if(who){ cues[who] = 1; if(!seen[who]){ seen[who] = 1; fresh++; } }
      }
    });
    var pages = sc.length ? (sc[sc.length-1].page - sc[0].page + 1) : 0;
    var lens = sc.map(function(s, i){
      return (i + 1 < sc.length ? sc[i+1].page : sc[i].page + 1) - s.page;
    });
    var mean = lens.length ? lens.reduce(function(a, b){ return a + b; }, 0) / lens.length : 0;
    var varr = lens.length ? Math.sqrt(lens.reduce(function(t, l){
      return t + Math.pow(l - mean, 2); }, 0) / lens.length) : 0;

    return {n:ep.n, written:true, pages:pages, scenes:sc.length,
      speakers:Object.keys(cues).length, newFaces:fresh,
      dialogueShare: (dlg + act) ? dlg / (dlg + act) : 0,
      sceneMean: Math.round(mean * 10) / 10,
      rhythm: mean ? clamp(varr / mean) : 0,
      words: dlg + act};
  });
}

/* ---------- the half that needed a script ---------- */

var LENGTH_HINT = [
  [/half.?hour|30.?min/i, 30], [/hour|60.?min/i, 60],
  [/feature|film|movie/i, 100], [/short/i, 12]
];
function expectedPages(format){
  for(var i = 0; i < LENGTH_HINT.length; i++)
    if(LENGTH_HINT[i][0].test(String(format || ""))) return LENGTH_HINT[i][1];
  return 0;
}

/*
  distance(ExpectedState, DraftState).
  Everything below is measured against what is actually on the page. Nothing
  is inferred, and where the plan and the draft simply differ rather than
  conflict, it says so instead of raising an alarm.
*/
function watch(genome, episodes, api){
  var findings = [], reads = [];
  var blocks = api.blocks(), scenes = api.scenes(), cast = api.reports().cast, pages = api.pageCount();

  var speaking = {};
  cast.forEach(function(c){ speaking[c.name.toUpperCase()] = c; });

  // cast declared vs cast heard
  var declared = (genome.cast || []).map(function(c){ return String(c.name || c).toUpperCase(); }).filter(Boolean);
  var main = String((genome.mainCharacter || {}).name || "").toUpperCase();
  if(main) declared.unshift(main);
  var silent = declared.filter(function(n){ return n && !speaking[n]; });
  var unplanned = Object.keys(speaking).filter(function(n){ return declared.indexOf(n) < 0; });

  if(declared.length){
    if(silent.length) findings.push({level:"warn",
      text: silent.length + " of " + declared.length + " planned " +
        (silent.length === 1 ? "character has" : "characters have") + " not spoken yet: " + silent.join(", ") + "."});
    else reads.push("Everyone in the treatment speaks.");
  }
  if(unplanned.length) findings.push({level:"note",
    text: unplanned.length + " speaking " + (unplanned.length === 1 ? "character is" : "characters are") +
      " not in the treatment: " + unplanned.slice(0, 8).join(", ") +
      (unplanned.length > 8 ? "\u2026" : "") + ". That is drift or it is discovery. You decide."});

  // main character presence
  if(main && speaking[main]){
    var share = cast.reduce(function(t, c){ return t + c.words; }, 0);
    var pctMain = share ? Math.round(speaking[main].words / share * 100) : 0;
    reads.push(main + " carries " + pctMain + "% of the spoken words across " + speaking[main].scenes +
      (speaking[main].scenes === 1 ? " scene." : " scenes."));
    if(pctMain < 15) findings.push({level:"warn",
      text: main + " is the treatment's one character but speaks " + pctMain + "% of the dialogue."});
  } else if(main && declared.length){
    findings.push({level:"bad", text: main + " is the main character of the treatment and has not spoken."});
  }

  // Planned length against written length, measured only over the episodes
  // actually begun. Comparing a first page to a whole season would shout
  // every time, which is the fastest way to teach someone to ignore this.
  var per = expectedPages(genome.format);
  var started = 0;
  if(episodes.length){
    var sect = blocks.filter(function(b){ return b.type === "Section"; })
                     .map(function(b){ return String(b.text || "").toUpperCase(); });
    started = episodes.filter(function(ep){
      return sect.some(function(m){ return m.indexOf("EPISODE " + ep.n) >= 0; });
    }).length;
  }
  if(per && episodes.length) reads.push("Plan: " + episodes.length + " \u00d7 " + per +
    " pages. Written: " + pages + " across " + started + " started.");
  if(per && started && pages > per * 0.4){
    var target = per * started;
    var off = pages - target;
    if(Math.abs(off) / target > 0.2) findings.push({level: Math.abs(off) / target > 0.5 ? "warn" : "note",
      text: "The " + started + (started === 1 ? " episode" : " episodes") + " begun run " +
            Math.abs(off) + " pages " + (off > 0 ? "over" : "under") + " the " + target +
            " the format implies."});
  }

  // episodes with nothing under them
  var marked = blocks.filter(function(b){ return b.type === "Section"; })
                     .map(function(b){ return String(b.text || "").toUpperCase(); });
  if(episodes.length && marked.length){
    var missing = episodes.filter(function(ep){
      return !marked.some(function(m){ return m.indexOf("EPISODE " + ep.n) >= 0; });
    });
    if(missing.length) findings.push({level:"note",
      text: missing.length + " planned " + (missing.length === 1 ? "episode has" : "episodes have") +
        " no section in the script yet."});
    else reads.push("Every planned episode has a section in the script.");
  }

  if(!scenes.length) findings.push({level:"note", text:"No scenes written yet. Build the skeleton to start."});
  else reads.push(scenes.length + (scenes.length === 1 ? " scene written." : " scenes written."));

  return {findings:findings, reads:reads,
          drift: findings.filter(function(f){ return f.level !== "note"; }).length};
}

/* ---------- skeleton ---------- */

function skeleton(genome, episodes){
  var out = [];
  episodes.forEach(function(ep){
    out.push({type:"Section", text:"EPISODE " + ep.n + ": " + ep.phase});
    out.push({type:"Synopsis", text:"A: " + ep.a});
    out.push({type:"Synopsis", text:"B: " + ep.b});
    if(ep.guest) out.push({type:"Synopsis", text:ep.guest});
    // A blank scene heading to type into. No blank action element: an empty
    // action prints as a blank line, and a skeleton must add nothing to the page.
    out.push({type:"Scene Heading", text:""});
  });
  return out;
}

/* ---------- panel ---------- */

WB.register({
  id: "storyforge",
  name: "StoryForge",
  version: "0.7",
  mount: function(host, api){
    var genome = null, episodes = [], scores = null, refs = [], showNote = false, showEps = false;
    var KEY = "storyforge_wb_genome";

    function load(){
      try{
        var raw = localStorage.getItem(KEY);
        if(!raw) return;
        var o = JSON.parse(raw);
        genome = o.genome; episodes = o.episodes || []; refs = o.refs || [];
        if(genome) scores = scoreTreatment(genome.features || featureVector(inputsOf(genome)), refs);
      }catch(e){}
    }
    function save(){
      try{ localStorage.setItem(KEY, JSON.stringify({genome:genome, episodes:episodes, refs:refs})); }catch(e){}
    }
    function inputsOf(g){
      return {title:g.title || "", format:g.format || "", count:g.count || 12,
        character:(g.mainCharacter && g.mainCharacter.raw) || "", ethos:g.ethos || "",
        genre:g.genre || "", world:g.world || "",
        cast:(g.cast || []).map(function(c){ return (c.name || c) + (c.function ? " \u2014 " + c.function : ""); }).join("\n"),
        ammo:g.rawAmmo || ""};
    }

    // Accepts the v0.7 export packet, a bare treatment, or the sample shape.
    function ingest(o){
      if(!o) throw new Error("empty");
      if(o.treatment && o.treatment.mainCharacter){ genome = o.treatment; episodes = o.episodes || []; }
      else if(o.mainCharacter){ genome = o; episodes = []; }
      else if(o.inputs){
        var i = o.inputs;
        genome = forge({title:o.title || "Untitled Treatment", format:o.format || "", count:12,
          character:i.character || "", ethos:i.ethos || "", genre:i.genre || "",
          world:i.world || "", cast:(i.cast || []).join("\n"), ammo:i.ammo || ""});
        if(o.treatment){
          if(o.treatment.premise) genome.premise = o.treatment.premise;
          if(o.treatment.episode_engine) genome.episodeEngine = o.treatment.episode_engine;
          if(o.treatment.season_engine) genome.seasonEngine = o.treatment.season_engine;
        }
        episodes = [];
      }
      else throw new Error("not a treatment genome");
      if(!genome.features) genome.features = featureVector(inputsOf(genome));
      if(!genome.mainCharacter) genome.mainCharacter = {name:"Main Character", raw:""};
      scores = scoreTreatment(genome.features, refs);
      if(!episodes.length) episodes = expand(genome, genome.count || 12);
      save(); draw();
    }

    function pct(n){ return Math.round(n * 100); }

    function draw(){
      if(!genome){
        host.innerHTML =
          '<p class="note-hint" style="padding:0 0 7px">Forge the treatment first, then bring it here. ' +
          'The script becomes the thing the plan is measured against.</p>' +
          '<div style="display:grid;gap:6px">' +
            '<button id="sf-import">Import a Treatment Genome\u2026</button>' +
            '<button id="sf-paste">Paste the export packet</button>' +
          "</div>" +
          '<p class="note-hint" style="padding:9px 0 0">Takes the v0.7 export JSON, a bare treatment, ' +
          'or the sample genome shape.</p>';
        host.querySelector("#sf-import").onclick = importFile;
        host.querySelector("#sf-paste").onclick = pasteIn;
        return;
      }

      var w = watch(genome, episodes, api);
      var s = scores;
      var band = s.AdjustedTreatmentScore > 0.76 ? "#4f9d69" : s.AdjustedTreatmentScore > 0.58 ? "#c8892f" : "#c25a4e";

      host.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<b style="color:#fff;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            esc(genome.title || "Untitled Treatment") + "</b>" +
          '<button id="sf-clear" style="padding:2px 7px" title="Drop this genome">\u00d7</button></div>' +
        '<div class="statgrid" style="padding:0">' +
          row("Cast", (genome.cast || []).length) +
          row("Episodes planned", episodes.length) +
        "</div>" +
        '<p class="note-hint" style="padding:8px 0 3px">What the treatment says, and what it doesn\'t ' +
          '<a href="#" id="sf-note" style="color:#c8892f">how this reads</a></p>' +
        '<div id="sf-vecs"></div>' +
        (showNote ? '<p class="note-hint" style="padding:6px 0;border-left:2px solid #c8892f;padding-left:8px">' +
          'A character has a goal, a fear, a flaw, a gift, a wound, a need and a voice. This lists which ' +
          'of those you have written down and which you haven\'t, by name. It reads words, so it knows ' +
          'whether you said something about the wound, not whether the wound is any good. No score.</p>' : "") +
        episodeBlock() +
        '<p class="note-hint" style="padding:9px 0 3px">Watchdog: the plan against the pages</p>' +
        '<div id="sf-watch"></div>' +
        '<div style="display:grid;gap:6px;margin-top:10px">' +
          '<button id="sf-skel">Build the episode skeleton</button>' +
          '<button id="sf-prompt">Copy the expansion prompt</button>' +
          '<button id="sf-export">Export the packet</button>' +
        "</div>";

      var vecs = host.querySelector("#sf-vecs");
      var e0 = s.features._essentials || {};
      var lines0 = [["Premise", ["somebody","wants","opposed","somewhere"].filter(function(k){ return e0[k]; }),
                                ["somebody","wants","opposed","somewhere"].filter(function(k){ return !e0[k]; })]];
      var inputs0 = inputsOf(genome);
      [["Character","character",inputs0.character],["Ethos","ethos",inputs0.ethos],["Genre","genre",inputs0.genre + " " + inputs0.ammo],["World","world",inputs0.world]]
        .forEach(function(g){ var r0 = slotsIn(g[2], g[1]); lines0.push([g[0], r0.hit, r0.miss]); });
      var kp = castPressure(inputs0.cast);
      lines0.push(["Cast", kp.per.filter(function(p){ return p.score >= 0.4; }).map(function(p){ return p.name; }),
                   kp.miss.length ? kp.miss.map(function(n){ return n + " (thin)"; }) : []]);
      lines0.forEach(function(L){
        var r = document.createElement("div");
        r.className = "note-hint";
        r.style.cssText = "padding:4px 0;border-bottom:1px solid #39434f";
        r.innerHTML = '<b style="color:#dfe6ee">' + esc(L[0]) + "</b> " +
          (L[1].length ? "has " + esc(L[1].join(", ").replace(/_/g, " ")) : "nothing yet") +
          (L[2].length ? '<br><span style="color:#c8892f">missing: ' + esc(L[2].join(", ").replace(/_/g, " ")) + "</span>" : "");
        vecs.appendChild(r);
      });

      var wbox = host.querySelector("#sf-watch");
      var colour = {bad:"#c25a4e", warn:"#c8892f", note:"var(--chrome-dim)"};
      w.findings.forEach(function(f){
        var d = document.createElement("p");
        d.className = "note-hint";
        d.style.cssText = "padding:3px 0 3px 8px;border-left:2px solid " + colour[f.level] +
          ";color:" + (f.level === "note" ? "var(--chrome-dim)" : colour[f.level]);
        d.textContent = f.text;
        wbox.appendChild(d);
      });
      w.reads.forEach(function(t){
        var d = document.createElement("p");
        d.className = "note-hint";
        d.style.padding = "2px 0";
        d.textContent = t;
        wbox.appendChild(d);
      });

      var novBtn = host.querySelector("#sf-refs");
      if(novBtn) novBtn.onclick = addRefs;
      var epsBtn = host.querySelector("#sf-eps-toggle");
      if(epsBtn) epsBtn.onclick = function(e){ e.preventDefault(); showEps = !showEps; draw(); };
      host.querySelector("#sf-note").onclick = function(e){ e.preventDefault(); showNote = !showNote; draw(); };
      host.querySelector("#sf-clear").onclick = function(){
        genome = null; episodes = []; scores = null;
        try{ localStorage.removeItem(KEY); }catch(e){}
        draw();
      };
      host.querySelector("#sf-skel").onclick = buildSkeleton;
      host.querySelector("#sf-prompt").onclick = copyPrompt;
      host.querySelector("#sf-export").onclick = exportPacket;
    }
    function row(k, v){ return "<div><span>" + k + "</span><b>" + v + "</b></div>"; }

    function noveltyBlock(s){
      if(s.Novelty == null)
        return '<p class="note-hint" style="padding:9px 0 3px">Novelty</p>' +
          '<p class="note-hint" style="padding:0 0 5px">Not measured. Novelty means distance from ' +
          'something, and there is nothing to measure against yet. Add three or more treatments as a ' +
          'reference set and it is computed properly; until then it is left out of the score rather ' +
          'than guessed at.</p><button id="sf-refs" style="width:100%">Add reference treatments\u2026</button>';
      var band = s.Novelty < 0.4 ? "#c25a4e" : s.Novelty > 0.8 ? "#c25a4e" : "#4f9d69";
      return '<p class="note-hint" style="padding:9px 0 3px">Novelty \u00b7 ' + s.refs + ' references</p>' +
        '<div class="statgrid" style="padding:0">' +
          '<div><span>Novelty</span><b style="color:' + band + '">' + pct(s.Novelty) + "%</b></div>" +
          '<div><span>Cluster fit</span><b>' + pct(s.ClusterFit) + "%</b></div>" +
          '<div><span>Gold zone</span><b>' + pct(s.GoldZone) + "%</b></div></div>" +
        '<p class="note-hint" style="padding:3px 0 5px">' +
          (s.Novelty < 0.4 ? "Close to the cluster \u2014 derivative risk."
           : s.Novelty > 0.8 ? "Far outside the cluster \u2014 readability risk."
           : "Inside the useful band: familiar but not derivative.") + "</p>" +
        '<button id="sf-refs" style="width:100%">Replace the reference set\u2026</button>';
    }

    function episodeBlock(){
      var reads = episodeReadings(episodes, api);
      var written = reads.filter(function(r){ return r.written; });
      if(!written.length)
        return '<p class="note-hint" style="padding:9px 0 3px">Episodes</p>' +
          '<p class="note-hint" style="padding:0">Nothing written under any episode yet. These read from ' +
          'the pages once there are pages. No curve is invented in the meantime.</p>';
      var head = '<p class="note-hint" style="padding:9px 0 3px">Episodes \u00b7 ' + written.length +
        ' written <a href="#" id="sf-eps-toggle" style="color:#c8892f">' +
        (showEps ? "hide" : "show") + "</a></p>";
      if(!showEps) return head;
      return head + '<div style="font-size:11px">' + written.map(function(r){
        return '<div style="display:grid;grid-template-columns:2.4em 1fr;gap:6px;padding:3px 0;border-bottom:1px solid #39434f">' +
          '<b style="color:#dfe6ee">EP' + r.n + "</b><span class=\"note-hint\" style=\"padding:0\">" +
          r.pages + "pp \u00b7 " + r.scenes + " sc \u00b7 " + r.speakers + " speaking" +
          (r.newFaces ? " \u00b7 " + r.newFaces + " new" : "") + "<br>" +
          pct(r.dialogueShare) + "% of the words are dialogue \u00b7 scenes avg " + r.sceneMean +
          "pp</span></div>";
      }).join("") + "</div>";
    }

    function addRefs(){
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = ".json,application/json"; inp.multiple = true;
      inp.onchange = function(){
        var files = Array.prototype.slice.call(inp.files || []);
        if(!files.length) return;
        Promise.all(files.map(function(f){ return f.text(); })).then(function(texts){
          var found = [];
          texts.forEach(function(t){
            var o;
            try{ o = JSON.parse(t); }catch(e){ return; }
            var list = Array.isArray(o) ? o : [o];
            list.forEach(function(item){
              var g = item.treatment && item.treatment.mainCharacter ? item.treatment
                    : item.mainCharacter ? item : null;
              if(g && g.features) found.push(g.features);
              else if(g) found.push(featureVector(inputsOf(g)));
              else if(item.character !== undefined) found.push(featureVector(item));
            });
          });
          if(found.length < MIN_REFS){
            api.toast("Need at least " + MIN_REFS + " treatments to form a cluster. Found " + found.length + ".");
            return;
          }
          refs = found.map(function(f){
            var o = {}; VEC_KEYS.forEach(function(k){ o[k] = f[k] || 0; }); return o;
          });
          scores = scoreTreatment(genome.features, refs);
          save(); draw();
          api.toast("Reference set of " + refs.length + ". Novelty is now measured against it.");
        });
      };
      inp.click();
    }

    function buildSkeleton(){
      var blocks = api.blocks();
      var already = blocks.filter(function(b){ return b.type === "Section" && /^EPISODE /i.test(b.text); }).length;
      if(already && !confirm("The script already has " + already +
        " episode sections. Add the skeleton again at the end?")) return;
      var parts = skeleton(genome, episodes);
      var last = blocks[blocks.length - 1];
      api.insertAfter(last.id, parts);
      api.record({tool:"StoryForge", raw:"", ids:[],
                  edits:[{kind:"skeleton", original:"", replacement:episodes.length + " episodes",
                          reason:"expanded from treatment " + (genome.title || "")}],
                  metrics:{episodes:episodes.length, elements:parts.length}});
      api.toast("Laid in " + episodes.length + " episodes. Sections and synopses do not print.");
      draw();
    }

    // The bridge: a prompt built from the treatment AND what is actually written.
    function copyPrompt(){
      var w = watch(genome, episodes, api);
      var cast = api.reports().cast.slice(0, 12)
        .map(function(c){ return c.name + " (" + c.speeches + " speeches, p." + c.first + "\u2013" + c.last + ")"; });
      var scenes = api.scenes().slice(-8).map(function(s){ return "p." + s.page + "  " + s.heading; });
      var next = episodes.find(function(ep){
        return !api.blocks().some(function(b){
          return b.type === "Section" && String(b.text).toUpperCase().indexOf("EPISODE " + ep.n) >= 0; });
      }) || episodes[0];

      var out = [
        "STORYFORGE TREATMENT-FIRST EXPANSION",
        "Use the Treatment Genome below as canon. Expand only from the approved treatment.",
        "Mark anything unsupported by it as PROPOSED. The author decides what is accepted.",
        "",
        "TREATMENT GENOME",
        "Title: " + (genome.title || ""),
        "Format: " + (genome.format || ""),
        "Main character: " + ((genome.mainCharacter || {}).raw || ""),
        "Ethos: " + (genome.ethos || ""),
        "Genre physics: " + (genome.genre || ""),
        "World: " + (genome.world || ""),
        "Premise: " + (genome.premise || ""),
        "Theme: " + (genome.theme || ""),
        "Episode engine: " + (genome.episodeEngine || ""),
        "Season engine: " + (genome.seasonEngine || ""),
        "Ending logic: " + (genome.endingLogic || ""),
        "Cast:",
      ].concat((genome.cast || []).map(function(c){ return "  - " + c.name + " \u2014 " + (c.function || ""); }));

      out = out.concat([
        "",
        "CURRENT DRAFT STATE",
        "Pages written: " + api.pageCount(),
        "Scenes written: " + api.scenes().length,
        "Speaking so far: " + (cast.join("; ") || "nobody yet"),
        "Most recent scenes:",
      ]).concat(scenes.map(function(s){ return "  " + s; }));

      if(w.findings.length) out = out.concat(["", "WATCHDOG"],
        w.findings.map(function(f){ return "  - " + f.text; }));

      out = out.concat(["", "TASK",
        next ? "Expand " + next.title + "." : "Expand the next episode.",
        next ? "  A story: " + next.a : "",
        next ? "  B story: " + next.b : "",
        "Preserve current state, open threads, cast voices and the author gate.",
        "End with a continuity receipt naming what changed."]);

      var text = out.filter(function(l){ return l !== ""; }).join("\n").replace(/\n{3,}/g, "\n\n");
      navigator.clipboard.writeText(text).then(function(){
        api.toast("Prompt copied: the treatment plus what is actually on the page.");
      }).catch(function(){
        var b = new Blob([text], {type:"text/plain"});
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = "expansion_prompt.txt";
        document.body.appendChild(a); a.click(); a.remove();
        api.toast("Clipboard refused; saved as a file instead.");
      });
    }

    function exportPacket(){
      var packet = {version:"0.7", treatment:genome, episodes:episodes, scores:scores,
        draft_state:{pages:api.pageCount(), scenes:api.scenes().length,
                     cast:api.reports().cast.map(function(c){
                       return {name:c.name, speeches:c.speeches, words:c.words,
                               first:c.first, last:c.last}; })},
        watchdog: watch(genome, episodes, api),
        doctrine:"1 character + 1 ethos + 1 genre + 1 world + cast = Treatment Genome. " +
                 "Treatment Genome expands to seasons, episodes, scenes, and scripts. AUTHOR GATE final."};
      var b = new Blob([JSON.stringify(packet, null, 2)], {type:"application/json"});
      var a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = (genome.title || "treatment").replace(/\s+/g, "_") + ".storyforge.json";
      document.body.appendChild(a); a.click(); a.remove();
      api.toast("Exported, with the draft state attached.");
    }

    function importFile(){
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = ".json,application/json";
      inp.onchange = function(){
        var f = inp.files[0]; if(!f) return;
        f.text().then(function(t){
          try{ ingest(JSON.parse(t)); api.toast("Genome loaded."); }
          catch(e){ api.toast("That is not a Treatment Genome."); }
        });
      };
      inp.click();
    }
    function pasteIn(){
      var t = prompt("Paste the StoryForge export packet:");
      if(!t) return;
      try{ ingest(JSON.parse(t)); api.toast("Genome loaded."); }
      catch(e){ api.toast("That did not parse as a Treatment Genome."); }
    }

    api.onChange(function(){ if(genome) draw(); });
    load();
    draw();
  }
});

if(typeof module !== "undefined" && module.exports)
  module.exports = {featureVector:featureVector, scoreTreatment:scoreTreatment, forge:forge,
                    expand:expand, watch:watch, skeleton:skeleton, expectedPages:expectedPages,
                    extractTheme:extractTheme, slotsIn:slotsIn, castPressure:castPressure,
                    noveltyAgainst:noveltyAgainst, episodeReadings:episodeReadings, SLOTS:SLOTS};
})();
