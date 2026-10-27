/* THE TOUR: every stop, in order. The narration lives here and in the doc "THEACTORPAGE Demo Tour: Narration";
   the caption on screen is this text, so change both together. Clip files: vo/<id>.mp3 (missing = the caption runs on a clock; never a computer voice).
   Each stop: id, ch (open | act | write | film | close), path (the page), line, and what to do there:
     act:  steps run in the page before the line (drop / click / open / eval / wait), in order
     hi:   what to light up while the line plays (a selector, or {text:'...'} for the block that starts with it) */
(function (g) {
  'use strict';
  const WB = 'write/writers-blockage.html';
  const S = [
    { id: 'O01', ch: 'open', path: 'how.html', hi: 'header', line: "If you're an actor, you know the drill. Sides in your email. Takes in your camera roll. Notes from class in your head. And a login for every one of them." },
    { id: 'O02', ch: 'open', path: 'how.html', hi: '.band.pitch', line: "And most of those apps rent your own work back to you. Stop paying, and it's gone. Here, your work stays on your own computer and your own phone. No upload. No account to get started." },
    { id: 'O03', ch: 'open', path: 'how.html', act: [{ drop: 'demo/low_tide.fountain' }, { wait: '#took [data-part]' }, { click: '#took [data-part$="|ANNA"]' }], hi: '#took', line: "It comes in two parts: Actor OS on your phone, and the studio on your computer. Put in a script once, like our made-up Low Tide, tap your part, and every tool has it." },

    { id: 'A00', ch: 'act', path: 'actor-os/', wash: true, ready: '#aosHome', act: [{ eval: "goTab('home')" }, { click: '#fPaste', unless: '#fPasteText' }, { paste: 'demo/low_tide_email.txt', sides: 'demo/low_tide.fountain', into: '#fPasteText' }], hi: '#aosHome', line: "ACT. Say your agent sends an audition at six. The tape's due tomorrow by noon. On your phone, open Actor OS and paste in the email." },
    { id: 'A01', ch: 'act', path: 'actor-os/', ready: '#aosHome', act: [{ click: '#fRead', optional: true }, { click: '#fDays', when: '#fDays[aria-expanded="false"]' }], hi: '#aosHome', line: "It reads the role, the show and the office, and lays out your days to the deadline. Then four steps: read, learn, shoot, send." },
    { id: 'A06', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="read"]' }], hi: '#readStep', line: "Read. Normally you print the sides and mark your lines with a pen. Here, every line of yours is lit, and the cue that leads into it. Open a fold for every question somebody asks you." },
    { id: 'A07', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="learn"]' }], hi: '#learnStep', line: "Learn. Say your lines out loud. It listens, and the lines you miss come back first, so you're not drilling the ones you already know." },
    { id: 'A02', ch: 'act', path: 'actor-os/', act: [{ eval: "goTab('home');AosFront.details(true)" }, { wait: '[data-kit="partner"]' }, { eval: 'window.scrollTo(0,0)' }], hi: '[data-kit="partner"]', line: "Now the hard part. Who reads with you? Read the whole scene once yourself, every part. It plays the other parts back as your reader, and waits for you to finish your line." },
    { id: 'A03', ch: 'act', path: 'actor-os/', act: [{ eval: "goTab('home');AosFront.details(true)" }], hi: '[data-kit="tape"]', line: "Then you shoot, on the phone you've got. It always asks before it turns the camera on, and it always shows you when it's on." },
    { id: 'A14', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="shoot"]' }], hi: '#remoteBtn', line: "Nobody behind the camera? A Bluetooth clicker rolls and cuts. Or link an old phone or a laptop to see your framing, run ROLL and CUT, and play each take back." },
    { id: 'A04', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="shoot"]' }], hi: '#cut', line: "After a take, it tells you what it heard. A line you went quiet on. A spot where the sound clipped. Not a grade. Just what casting will hear." },
    { id: 'A05', ch: 'act', path: 'actor-os/', act: [{ click: 'nav button[data-tab="send"]' }], hi: 'nav button[data-tab="send"]', line: "Then the part everybody hates. No editing app, no compression app, no guessing what to call the file. It trims it, sizes it and names it the way the office asked. You send it." },
    { id: 'A08', ch: 'act', path: 'actor-os/', act: [{ eval: "goTab('home');AosFront.details(true)" }, { open: '#dailySec' }], hi: '#dailySec', line: "No audition this week? It pulls a practice scene out of material you already have. Here, the kitchen scene from Low Tide." },
    { id: 'A09', ch: 'act', path: 'characters/', ready: '#bank', hi: '#bank', line: "When they call you back three weeks later, you need that voice again. Characters keeps it in your own voice, with the line that drops you right back in." },
    { id: 'A10', ch: 'act', path: 'how.html', hi: '.fcol[data-dept="act"]', line: "The studio holds the rest. Your headshots and looks. Your résumé and press, on your page. A VO booth for the closet. Every audition and casting office, and what they told you." },
    { id: 'A11', ch: 'act', path: 'how.html', hi: '#drop', line: "And it all talks to itself. Drop the self-tape request with the sides, and it opens on your part. The take you keep goes to your page, ready to send." },
    { id: 'A12', ch: 'act', path: 'spotted/', ready: '#wsay', act: [{ click: '#wsay' }, { eval: "document.getElementById('sayrole').value='HARBOR MASTER'" }, { click: '#saygo' }, { wait: '#t_pa' }], hi: '#main', line: "Saw a role your reps might have missed? Send them the screenshot and one polite line: just passing this along." },
    { id: 'A13', ch: 'act', path: 'hub/?tab=reps', ready: '#view', hi: '#view', line: "Then your reps. One sheet for your agent and manager: your work, where you stand, what's casting that fits. After the first one, only what's new." },

    { id: 'M00', ch: 'own', dept: 'write', path: 'how.html', wash: true, hi: '#own', line: "No audition this week? Make your own. A monologue, a scene for your reel, a short with a friend. Here's one scene, on the page." },
    { id: 'M01', ch: 'own', dept: 'write', path: WB, ready: '[contenteditable="true"]', act: [{ openScript: 'demo/low_tide.fountain' }], hi: '[contenteditable="true"]', line: "Write it in THEACTORPAGES. Type it, or talk it into your phone. It sets it up like a real script. And it never writes a word for you." },
    { id: 'M02', ch: 'own', dept: 'write', path: WB, act: [{ rail: true }, { click: '#railtabs [data-pane="panel:tools"]' }, { click: '[id="pane-panel:tools"] [data-wt="rep"]' }], hi: '[id="pane-panel:tools"]', line: "Before anybody reads it, Tools gives it a second look. A word you leaned on seven times. A name spelled two ways. It shows you. You decide." },
    { id: 'M03', ch: 'own', dept: 'write', path: 'papertrail/', ready: '#main', act: [{ click: '[data-open]', optional: true }, { click: '[data-tab="drafts"]', optional: true }], hi: '#main', line: "Every draft is kept, and nothing is written over. And your scene is already your sides. No export. Open it in Actor OS and run it." },

    { id: 'C01', ch: 'close', path: 'how.html', hi: 'header', line: "That's the idea. The studio on your computer, Actor OS on your phone. You put your material in once, and every tool uses it. And it works with no signal." },
    { id: 'C02', ch: 'close', path: 'how.html', hi: '#you', line: "The free version does everything you just saw. Keep playing with Low Tide, or drop in your own." }
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
