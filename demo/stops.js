/* THE TOUR: every stop, in order. The narration lives here and in the doc "THEACTORPAGE Demo Tour: Narration";
   the caption on screen is this text, so change both together. Clip files: vo/<id>.mp3 (missing = the stand-in voice).
   Each stop: id, ch (open | act | write | film | close), path (the page), line, and what to do there:
     act:  steps run in the page before the line (drop / click / open / eval / wait), in order
     hi:   what to light up while the line plays (a selector, or {text:'...'} for the block that starts with it) */
(function (g) {
  'use strict';
  const WB = 'write/writers-blockage.html';
  const S = [
    { id: 'O01', ch: 'open', path: '', hi: 'header', line: 'This is THEACTORPAGE. Tools for actors, writers and filmmakers, on the phone you already have.' },
    { id: 'O02', ch: 'open', path: '', hi: '.band.pitch', line: 'Most services rent you your own work back. Stop paying, and your reel, your sides, your drafts go dark. Here, your work stays on your device.' },
    { id: 'O03', ch: 'open', path: '', act: [{ drop: 'demo/low_tide.fountain' }, { wait: '#took [data-part]' }, { click: '#took [data-part$="|ANNA"]' }], hi: '#took', line: 'To show you, we loaded a made-up script called Low Tide. Watch it go through everything.' },

    { id: 'A00', ch: 'act', path: '', wash: true, hi: '.band.act', line: 'A self-tape eats your night. No reader, five apps, and files named wrong. This fixes that.' },
    { id: 'A01', ch: 'act', path: 'actor-os/', ready: '#sidesOut button, #sidesOut .on, #sidesOut *', hi: '#sidesOut', line: 'Start with an audition. Drop in your sides and pick your role. It finds every line that\'s yours, and every cue.' },
    { id: 'A02', ch: 'act', path: 'actor-os/', act: [{ eval: 'window.scrollTo(0,0)' }], hi: '[data-kit="partner"]', line: 'No reader? Read the whole scene once, out loud. It cuts out the other parts and plays them back, and waits for you on your lines.' },
    { id: 'A03', ch: 'act', path: 'actor-os/', hi: '[data-kit="tape"]', line: 'This is where it asks for the camera. It always asks first, and it always shows you when it\'s on.' },
    { id: 'A04', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="cut"]' }], hi: 'nav button[data-tab="cut"]', line: 'After a take, it tells you what it heard. Where you went quiet, where you clipped. It doesn\'t grade you.' },
    { id: 'A05', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="send"]' }], hi: 'nav button[data-tab="send"]', line: 'Then it trims and names the files the way the office asked, and you send them.' },
    { id: 'A08', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="prep"]' }, { open: '#dailySec' }], hi: '#dailySec', line: 'Nothing to tape this week? It pulls a practice scene out of your own material. Here, the kitchen scene.' },
    { id: 'A06', ch: 'act', path: 'breakdown/', ready: '#main', hi: '#main', line: 'Breakdown lays out your role scene by scene. Every line, every cue, every question put to you.' },
    { id: 'A07', ch: 'act', path: 'memorizer/', ready: '#main', hi: '#main', line: 'Memorizer checks your lines word for word as you say them. The ones you drop come back first.' },
    { id: 'A09', ch: 'act', path: 'cps/', hi: '[data-a="frombd"]', line: 'Character Bank keeps a role in your own voice, so weeks later one line drops you back in.' },
    { id: 'A10', ch: 'act', path: '', hi: '.fcol[data-dept="act"]', line: 'And there\'s more. A VO booth for your closet, your headshots, your résumé, and every audition in one place.' },

    { id: 'W00', ch: 'write', path: '', wash: true, hi: '.band.write', line: 'Writing alone, nobody catches the small stuff until a reader does. Or a producer.' },
    { id: 'W01', ch: 'write', path: WB, ready: '[contenteditable="true"]', act: [{ openScript: 'demo/low_tide.fountain' }], hi: '[contenteditable="true"]', line: 'Writers Blockage is a full screenplay editor. Type, or write by talking. It formats what you say. It never writes a word you didn\'t.' },
    { id: 'W02', ch: 'write', path: WB, act: [{ rail: true }, { click: '#railtabs [data-pane="panel:tools"]' }, { click: '[id="pane-panel:tools"] [data-wt="rep"]' }], hi: '[id="pane-panel:tools"]', line: 'Tools reads your draft like a second pair of eyes. Here, slowly. Seven times, four in the first three scenes.' },
    { id: 'W03', ch: 'write', path: WB, act: [{ rail: true }, { click: '[id="pane-panel:tools"] [data-wt="drift"]' }], hi: '[id="pane-panel:tools"]', line: 'A name spelled two ways. Father Keane, and in the last scene, Father Kean. You decide which one is right.' },
    { id: 'W04', ch: 'write', path: WB, act: [{ rail: true }, { click: '[id="pane-panel:tools"] [data-wt="fmt"]' }], hi: '[id="pane-panel:tools"]', line: 'And a scene heading with no INT. or EXT. It prints fine, but a schedule won\'t see the new scene. Tap GO and you\'re there.' },
    { id: 'W05', ch: 'write', path: WB, act: [{ rail: true }, { click: '[id="pane-panel:tools"] [data-wt="hear"]' }], hi: '[id="pane-panel:tools"]', line: 'Hear it reads a scene back, a voice for each part, so you hear what\'s clunky.' },
    { id: 'W06', ch: 'write', path: 'papertrail/', ready: '#main', hi: '#main', line: 'Paper Trail keeps every draft, shows what changed scene by scene, and keeps everything you cut.' },

    { id: 'F00', ch: 'film', path: '', wash: true, hi: '.band.film', line: 'On a small shoot, you lose takes, light and time, and the editor gets a mess. Here\'s the fix.' },
    { id: 'F01', ch: 'film', path: 'film/', ready: '#main', act: [{ click: '#tabs [data-r="prep"]' }, { click: '#sub [data-t="scenes"]' }], hi: '#main', line: 'Story Studio takes the same script and splits it into scenes. Pick how you shoot each one: with a crew, or playing every part yourself.' },
    { id: 'F02', ch: 'film', path: 'film/', act: [{ click: '#tabs [data-r="set"]' }, { click: '[data-allway="crew"]', optional: true }, { click: '#tabs [data-r="prep"]' }, { click: '#sub [data-t="shots"]' }], hi: '#main', line: 'You get a shot list, and a shoot day grouped by place and light, with sunrise and sunset for each place.' },
    { id: 'F03', ch: 'film', path: 'film/', act: [{ click: '#tabs [data-r="set"]' }, { click: '#sub [data-t="set"]' }, { later: 3200, click: '[data-mk=""]' }, { later: 5400, click: '[data-mk="gold"]' }], hi: '.nowcard', line: 'On the day, it shows the shot you\'re on and the take number. Log the take, circle it, add a note.' },
    { id: 'F04', ch: 'film', path: 'film/', act: [{ click: '#clickon', unless: '.clicklegend' }], hi: '.clickrow', line: 'Got a Bluetooth clicker? One press logs the take. Two circles it. Three, the shot\'s done. You never look down.' },
    { id: 'F05', ch: 'film', path: 'film/', act: [{ click: '#clickon', when: '.clicklegend' }, { click: '#sub [data-t="tools"]' }], hi: '.ktabs', line: 'Tools is a kit in your pocket. A level, where the sun will be, exposure and focus, frame lines, a light check, room tone.' },
    { id: 'F06', ch: 'film', path: 'film/', act: [{ click: '[data-ktool="frame"]' }], hi: '#camstart', line: 'And your picture, live on a second phone. No app, no account, no server.' },
    { id: 'F07', ch: 'film', path: 'film/', act: [{ click: '#sub [data-t="set"]' }, { click: '#wrapit' }], hi: 'pre.wrap', line: 'At wrap, one report for your editor and crew. The circled takes, every note, and what\'s still to shoot.' },
    { id: 'F08', ch: 'film', path: 'film/', act: [{ click: '#wrapback', optional: true }, { click: '#tabs [data-r="post"]' }], hi: '#main', line: 'After, find any take by what you remember, cut to length, and hand your editor an edit list.' },

    { id: 'C01', ch: 'close', path: '', hi: 'header', line: 'That\'s the tour. It works with no connection, your work stays where you put it, and the free version has every feature.' },
    { id: 'C02', ch: 'close', path: '', hi: '#you', line: 'Keep playing with Low Tide, or drop in your own script.' }
  ];
  const CH = { open: { name: 'OPEN', color: '#ece7dc' }, act: { name: 'ACT', color: '#e0a23c' }, write: { name: 'WRITE', color: '#ece7dc' }, film: { name: 'FILM', color: '#6fa8d6' }, close: { name: 'CLOSE', color: '#ece7dc' } };
  /* the stops for the departments you show (SHOW ME); the open and close always */
  const pick = depts => S.filter(s => s.ch === 'open' || s.ch === 'close' || depts.includes(s.ch));
  const secs = s => Math.max(3, Math.round(s.line.split(/\s+/).length / 2.5 + 0.8));
  g.TourStops = { S, CH, pick, secs };
  if (typeof module !== 'undefined') module.exports = g.TourStops;
})(typeof window !== 'undefined' ? window : globalThis);
