# VIRTUAL RESUME v0.3 · Actor Edition

*Make the work. It becomes the résumé.*

**Asset #10.** Replaces VIRTUAL RESUME v0.2 (Castability Engine).

**Mission:** you're new and you don't have credits. You shoot your own work: a scene with a friend, a short, a monologue, a self-tape. VIRTUAL RESUME turns that into résumé-worthy experience, honestly. A finished, titled, credited piece that's been shown somewhere is a real credit. A monologue or a self-tape is a clip: it goes on your page, not your credit list. The tool shows you what each piece needs to count, and what to make next.

## The flow
1. **WORK** · Drop your videos, or bring them in from ARCHBOOK. Tap a piece and say what it is: short film, web series, music video, student film, theatre, scene, monologue, self-tape. Then add your character, the size of the role, what else you did (wrote, directed, produced, edited), who directed it, whether it's finished, and where people can watch it. A live checklist shows the steps to a credit. Each piece reads **Credit**, **3 of 4 to a credit**, or **Clip · on your page**.
2. **TRAINING** · Class, teacher, school. One line each.
3. **YOU** · The top of the résumé: name, union, email, phone, rep, height, hair, eyes, headshot, special skills (tap or type). **Bring in from SLATE MAKER** fills what you already entered there.
4. **NEXT** · What moves your résumé, nearest win first. "One step from a credit: shown somewhere for Kitchen." Plus your ARCHBOOK shoot list, and prompts when training or skills are empty.
5. **SEND** · A live one-page résumé preview, 8×10 (to staple to the back of a headshot) or Letter, with an optional headshot at the top. It tightens the type to fit one page and tells you when it can't. You also get:
   - **Print / Save PDF**
   - **Copy as text** (for casting-site forms)
   - **Your page (.zip):** a folder with index.html, your videos and headshot that you can host anywhere. Credits come first.
   - **Library file**

## The honesty rules
- **Film-type credit:** has a title, it's finished (edited, beginning to end), a director or production is named (or you're credited as self-produced), and it's shown somewhere (a public link, festival or screening).
- **Theatre credit:** title, your role, the company or venue, and it was performed for an audience.
- **Self-made work is labelled for what it is:** "Self-produced", or "Self-produced, dir. by actor" when you directed it. Never dressed up as someone else's production.
- **You can still put an unfinished piece on the résumé,** and it's marked "(in progress)". Nothing is hidden and nothing is faked.
- **No scores.** v0.2's Castability Score, buyer views and keyword role-fit are gone. ARCHBOOK already handles matching a breakdown.

## v0.2 → v0.3
| v0.2 | Now |
|---|---|
| Castability Score (weighted) | Gone. A credit checklist per piece |
| "Proof wall", "buyer views", "gap control" | Plain words: work, credit, clip, next to make |
| Role-fit from a fixed list of 28 keywords | Left to ARCHBOOK. Its shoot list feeds NEXT |
| Files typed as names ("headshot_lawman.jpg") | Real videos and a real headshot, or brought in from ARCHBOOK and SLATE MAKER |
| JSON report | An industry-format résumé (PDF, text) and a page you can host |
| Desktop grid, form first, sample data pre-filled | Phone first, material first, nothing pre-filled |

## Proven vs hypothesized
**Proven (headless Chromium, 390px phone + desktop, all four ACT tools on one origin):**
- Engine: 24/24. Credit rules for film, theatre and clips. Honest company labels. Résumé model: only credits, held-back list with what's missing, forced unfinished marked. Text résumé in standard order. Next-to-make, nearest first. Page: credits first, hidden pieces stay off, escaped. ZIP.
- App: 34/34.
  - Fresh install doesn't create ARCHBOOK's or SLATE MAKER's storage by peeking.
  - Imports a clip, with its video, from ARCHBOOK, plus the shoot list.
  - Imports name, height, location and headshot from SLATE MAKER.
  - A scene is turned into a credit step by step: 2 of 4 → 3 of 4 → NEXT points at the missing step → a link makes it a credit.
  - The résumé shows only credits.
  - Copy as text is exact.
  - **Printed PDF: 1 page, 576×720 pt (8×10 in).**
  - **Page zip:** valid; opened from the unzipped folder, both videos load and the headshot shows.
  - Reload keeps everything including videos. Library file. Offline.
  - No console errors, taps 40px+, no overflow.

**Hypothesized (not tested):**
- **Real phones.** Run `tests/probe.html`. iOS Safari's support for `indexedDB.databases()` and printing to PDF at 8×10 is untested. If `databases()` is missing, imports are skipped rather than guessed.
- **ARCHBOOK clips with "Keep copies" off** can't be brought in with their video. It says so and asks you to drop the file.
- **Real résumés** with 15+ credits: the fit-to-one-page tightening stops at 8.5pt and then tells you to cut.
- **Casting-site text forms** vary. The text is a clean starting point, not tailored per site.
- **Hosting the page:** it's a plain folder. A hosted page on theactorpage.com waits for the publish layer.

## Files
```
index.html, app.js      the app
engine.js               credit rules, résumé model, text, next-to-make, page HTML, ZIP (pure, runs in Node)
sw.js, manifest.webmanifest, icons/, fonts/   offline + home screen
tests/run_tests.js      node tests/run_tests.js
tests/probe.html        open on each phone
MANIFEST.json           bytes + sha256 per file
```

## Delivery
Drop `resume/` next to `breakdown/`, `archbook/` and `slate/` (e.g. `/act/resume/`). It must share their origin to bring in your clips and kit.

## 0.4 (2026-10-14): who it's for
Mined from SHOWCASE: one body of work, a different page per person. SEND asks **Who's it for?**
- **Casting:** headshot, slate (a piece set to Slate), your 3 best clips for the role, résumé, contact. Name the role and paste the breakdown, and the clips that fit it come first, with what they matched on.
- **Agent or manager:** your range, clips grouped by type (the tags you gave them in ARCHBOOK come across, or type them on the piece), credits and links. Optionally what you're shooting next.
- **Director:** the scene work, best match first, character named. No stats block, no slate.
- **Anyone:** the page as before.
The zip is named for who it's for and carries only the clips on that page. "Copy the email note" gives a short note to match. A clip only matches a role on what it actually carries (its types, title, character, its line); an empty field matches nothing. Private prep (Actor OS why and next-time notes, CPS) never goes on a page.
