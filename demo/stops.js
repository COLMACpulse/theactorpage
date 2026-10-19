/* THE TOUR: every stop, in order. The narration lives here and in the doc "THEACTORPAGE Demo Tour: Narration";
   the caption on screen is this text, so change both together. Clip files: vo/<id>.mp3 (missing = the stand-in voice).
   Each stop: id, ch (open | act | write | film | close), path (the page), line, and what to do there:
     act:  steps run in the page before the line (drop / click / open / eval / wait), in order
     hi:   what to light up while the line plays (a selector, or {text:'...'} for the block that starts with it) */
(function (g) {
  'use strict';
  const WB = 'write/writers-blockage.html';
  const S = [
    { id: 'O01', ch: 'open', path: '', hi: 'header', line: "If you're an actor, you know the drill. Sides in your email. Takes in your camera roll. The notes from class in your head. And a login for every one of them." },
    { id: 'O02', ch: 'open', path: '', hi: '.band.pitch', line: "And most of those apps rent your own work back to you. Stop paying, and it's gone. Here, everything stays on your phone. No upload. No account to get started." },
    { id: 'O03', ch: 'open', path: '', act: [{ drop: 'demo/low_tide.fountain' }, { wait: '#took [data-part]' }, { click: '#took [data-part$="|ANNA"]' }], hi: '#took', line: "Here's how it works. We made up a short script called Low Tide. You drop it in once, right here, and tap the part that's yours. That's it. Every tool on the site has it now." },

    { id: 'A00', ch: 'act', path: '', wash: true, hi: '.band.act', line: "ACT. Say your agent sends an audition at six. The tape's due tomorrow by noon." },
    { id: 'A01', ch: 'act', path: 'actor-os/', ready: '#sidesOut button, #sidesOut *', hi: '#sidesOut', line: "Normally you print the sides, grab a pen and mark your lines. Here, that's done. Every line of yours is lit, and every cue that leads into it." },
    { id: 'A06', ch: 'act', path: 'breakdown/', ready: '#main', hi: '#main', line: "Want to dig in? Breakdown lays out your character scene by scene. What you say, who you say it to, every question somebody asks you. Your notes stay pinned to the page." },
    { id: 'A07', ch: 'act', path: 'memorizer/', ready: '#main', hi: '#main', line: "Then get off book. Say your lines out loud. It listens, and the lines you blow come back first, so you're not drilling the ones you already know." },
    { id: 'A02', ch: 'act', path: 'actor-os/', ready: '[data-kit="partner"]', act: [{ eval: 'window.scrollTo(0,0)' }], hi: '[data-kit="partner"]', line: "Now the hard part. Who reads with you? Asking a friend at nine at night is weird. So read the whole scene once yourself, every part. It keeps the other parts and plays them back as your reader, and it waits for you to finish your line." },
    { id: 'A03', ch: 'act', path: 'actor-os/', hi: '[data-kit="tape"]', line: "Then you shoot, on the phone you've got. It always asks before it turns the camera on, and it always shows you when it's on." },
    { id: 'A04', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="cut"]' }], hi: 'nav button[data-tab="cut"]', line: "After a take, it tells you what it heard. A line you went quiet on. A spot where the sound clipped. Not a grade. Just what casting will hear." },
    { id: 'A05', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="send"]' }], hi: 'nav button[data-tab="send"]', line: "Then the part everybody hates. No editing app, no compression app, no guessing what to call the file. It trims it, sizes it and names it the way the office asked. You send it." },
    { id: 'A08', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="prep"]' }, { open: '#dailySec' }], hi: '#dailySec', line: "No audition this week? It pulls a practice scene out of material you already have. Here, the kitchen scene from Low Tide." },
    { id: 'A09', ch: 'act', path: 'cps/', ready: '[data-a="frombd"]', hi: '[data-a="frombd"]', line: "And when they call you back three weeks later, you need that voice again. Character Bank keeps it, in your own voice, with the line that drops you right back in. Record again, and it shows you what moved." },
    { id: 'A10', ch: 'act', path: '', hi: '.fcol[data-dept="act"]', line: "There's more. A VO booth for the closet. Your headshots, in your words. A slate. Every audition and every casting office, and what they told you, in one place." },
    { id: 'A11', ch: 'act', path: '', hi: '#drop', line: "And it all talks to itself. Drop the self-tape request with the sides, and it opens on your part. The take you keep goes to your hub, ready to send." },

    { id: 'M00', ch: 'own', dept: 'write', path: '', wash: true, hi: '.band.write', line: "No audition this week? Make your own. A scene for your reel, a short with a friend. Here's one scene, from the page to the finished piece." },
    { id: 'M01', ch: 'own', dept: 'write', path: WB, ready: '[contenteditable="true"]', act: [{ openScript: 'demo/low_tide.fountain' }], hi: '[contenteditable="true"]', line: "Write it in Writers Blockage. Type it, or talk it into your phone. It sets it up like a real script. And it never writes a word for you." },
    { id: 'M02', ch: 'own', dept: 'write', path: WB, act: [{ rail: true }, { click: '#railtabs [data-pane="panel:tools"]' }, { click: '[id="pane-panel:tools"] [data-wt="rep"]' }], hi: '[id="pane-panel:tools"]', line: "Before anybody reads it, Tools gives it a second look. A word you leaned on seven times. A name spelled two ways. It shows you. You decide." },
    { id: 'M03', ch: 'own', dept: 'write', path: 'papertrail/', ready: '#main', act: [{ click: '[data-open]', optional: true }, { click: '[data-tab="drafts"]', optional: true }], hi: '#main', line: "Every draft is kept, and nothing is written over. And your scene is already your sides. No export. Open it in Actor OS and run it." },
    { id: 'M04', ch: 'own', dept: 'film', path: 'film/', ready: '#main', act: [{ click: '#tabs [data-r="set"]' }, { click: '[data-allway="crew"]', optional: true }, { click: '#tabs [data-r="prep"]' }, { click: '#sub [data-t="shots"]' }], hi: '#main', line: "Story Studio has it too. It splits the script into scenes, and builds the shot list and the day around what you've got, and where the sun will be." },
    { id: 'M05', ch: 'own', dept: 'film', path: 'film/', act: [{ click: '#tabs [data-r="set"]' }, { click: '#sub [data-t="set"]' }, { later: 4200, click: '[data-mk=""]' }, { later: 7400, click: '[data-mk="gold"]' }], hi: '.nowcard', line: "On the day, log every take as you go. Circle the good ones, add a note. If your hands are full, or you're the one in the shot, a Bluetooth clicker does it." },
    { id: 'M06', ch: 'own', dept: 'film', path: 'film/', act: [{ click: '#wrapit' }], hi: 'pre.wrap', line: "At wrap, your editor gets a map instead of a mess. Every circled take, every note, what has to stay." },
    { id: 'M07', ch: 'own', dept: 'film', path: 'filmhub/', ready: '#main', hi: '#main', line: "And the finished piece goes on your page, with everybody who worked on it." },

    { id: 'C01', ch: 'close', path: '', hi: 'header', line: "That's the idea. You drop it in once, and every tool knows it. Your work stays on your phone, and it works with no signal." },
    { id: 'C02', ch: 'close', path: '', hi: '#you', line: "The free version does everything you just saw. Keep playing with Low Tide, or drop in your own." }
  ];
  const CH = { open: { name: 'OPEN', color: '#ece7dc' }, act: { name: 'ACT', color: '#e0a23c' }, own: { name: 'MAKE YOUR OWN', color: '#ece7dc', wash: 'linear-gradient(90deg,#ece7dc 0 50%,#6fa8d6 50% 100%)' }, close: { name: 'CLOSE', color: '#ece7dc' } };
  /* the light's color: the department the stop is in (Make your own is writing, then filming) */
  const DEPT = { write: '#ece7dc', film: '#6fa8d6' };
  const tint = s => s.dept ? DEPT[s.dept] : CH[s.ch].color;
  /* the chapters you pick (ACT, Make your own); the open and close always */
  const pick = chs => S.filter(s => s.ch === 'open' || s.ch === 'close' || chs.includes(s.ch));
  const secs = s => Math.max(3, Math.round(s.line.split(/\s+/).length / 2.5 + 0.8));
  g.TourStops = { S, CH, pick, secs, tint };
  if (typeof module !== 'undefined') module.exports = g.TourStops;
})(typeof window !== 'undefined' ? window : globalThis);
