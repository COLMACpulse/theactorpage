/* CLICKER: a Bluetooth remote (the cheap selfie kind, a page turner, earbuds' play button) as presses.
   Counts presses that come close together: one, two, three. The page decides what each count does.
   Heard from: keys the remotes send (volume, enter, space, page up/down, play), and the phone's media buttons.
   iOS only hands media buttons to a page that is playing something, so it plays a muted, silent loop while on.
   Only on while you turn it on. Typing in a box is never counted. */
(function (g) {
  'use strict';
  const C = {};
  C.KEYS = new Set([' ', 'Spacebar', 'Enter', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'AudioVolumeUp', 'AudioVolumeDown', 'VolumeUp', 'VolumeDown', 'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaTrackNext', 'MediaTrackPrevious']);
  C.SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';
  /* the counting, on its own so it can be tested without a page.
     same: events closer than this are one press (some remotes send two keys for one push)
     gap: a press within this of the last one joins the group; after it, the group is done */
  C.counter = function (done, o) {
    o = o || {}; const same = o.same == null ? 150 : o.same, gap = o.gap == null ? 650 : o.gap, max = o.max || 3;
    let n = 0, last = -1e9, t = null; const now = o.now || (() => Date.now()), later = o.later || ((f, ms) => setTimeout(f, ms)), stop = o.stop || (x => clearTimeout(x));
    const fire = () => { const k = n; n = 0; t = null; if (k) done(Math.min(k, max)); };
    const press = function () {
      const at = now(); if (at - last < same) return false; last = at;
      n++; if (t) stop(t);
      if (n >= max) { fire(); return true; }
      t = later(fire, gap); return true;
    };
    press.pending = () => n; press.flush = () => { if (t) stop(t); fire(); }; press.reset = () => { if (t) stop(t); n = 0; t = null; };
    return press;
  };
  /* on a page: make({onPresses(n), onPress(n so far), title}) -> {on(), off(), isOn} */
  C.make = function (o) {
    let ON = false, audio = null;
    const press = C.counter(n => o.onPresses && o.onPresses(n), o);
    const hit = () => { if (press() && o.onPress) o.onPress(press.pending()); };
    const key = e => {
      if (!ON || e.repeat) return; const t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!C.KEYS.has(e.key)) return;
      e.preventDefault(); e.stopPropagation(); hit();
    };
    const ACTS = ['play', 'pause', 'stop', 'nexttrack', 'previoustrack'];
    const api = {
      get isOn() { return ON; },
      async on() {
        if (ON) return; ON = true; g.addEventListener('keydown', key, true);
        try { if (!audio) { audio = document.createElement('audio'); audio.loop = true; audio.muted = true; audio.playsInline = true; audio.setAttribute('playsinline', ''); audio.src = C.SILENCE; } const pl = audio.play(); if (pl && pl.catch) pl.catch(() => { }); } catch (e) { }
        try { const M = navigator.mediaSession; if (M) { if (g.MediaMetadata) M.metadata = new MediaMetadata({ title: o.title || 'Clicker on', artist: 'Ready' }); ACTS.forEach(a => { try { M.setActionHandler(a, hit); } catch (e) { } }); M.playbackState = 'playing'; } } catch (e) { }
      },
      off() {
        if (!ON) return; ON = false; press.reset(); g.removeEventListener('keydown', key, true);
        try { audio && audio.pause(); } catch (e) { }
        try { const M = navigator.mediaSession; if (M) { ACTS.forEach(a => { try { M.setActionHandler(a, null); } catch (e) { } }); M.playbackState = 'none'; } } catch (e) { }
      },
      press: hit
    };
    return api;
  };
  g.Clicker = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
