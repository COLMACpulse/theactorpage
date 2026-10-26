# Tour narration clips

One file per stop, named by its clip ID: `O01.mp3`, `A03.mp3`, and so on (the IDs and lines are in `../stops.js`
and the doc "THEACTORPAGE Demo Tour: Narration"). Mono, 64 kbps MP3 is plenty.

A stop with no clip here shows its caption on a clock instead (never a computer voice), so the tour works before every line is recorded.
If you change a line when you record it, change it in `stops.js` too: that text is the caption.

To record them all at once: open `demo/record.html` (not linked from the site), read the whole tour in one take
with a slow two-count between lines, check the clips, and SAVE FOR THE SITE. Then `sh tools/tourvo.sh tour-voice.zip`
turns the zip into these MP3s.
