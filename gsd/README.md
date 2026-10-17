# GSD: Get Shit Done v1.1.1 SIR

Audio-first task pressure app with optional Severity and TIMEBOUND deadline behavior.

## What it does
- Captures spoken or typed task dumps.
- Sorts tasks into Today / This Week / This Month.
- Asks: what do you want to do? What do you need to get done? Works for a house, a ranch, work, goals, personal stuff, chores, and actors, writers and filmmakers.
- Lanes are yours to name (LANES). Starts with Work, Home, Craft, Goals, Personal. It guesses a lane from the words; you can move anything.
- Computes pressure score using importance, urgency, age, optional severity, and optional deadline pressure.
- Tracks Open / Working / Done / Killed.
- Generates reminders and daily receipts.
- Stores locally in browser localStorage.
- Exports JSON receipts/data.

## Run
Open `index.html` in a browser.

Voice capture works in browsers that support Web Speech Recognition. Chrome sends what you say to Google, Safari to Apple. Typed capture always works.

## Fixed in v1.1.1
- The lead you say first comes off clean: "Shit I need done today:" no longer leaves ": feed goats".
- "Reminder, this shit needs to get done: renew passport" is one task, "renew passport".
- Today / week / month only from whole words: "the weekend" is not this week, "the monthly bill" is not this month.
- "and" / "then" only split when a new thing to do follows: "call Bob and Sue" and "rock and roll practice" stay one; "tape it and send it" is two.
- Lanes you name yourself, in place of the old fixed categories.
- Import JSON (the export comes back in, no doubles). Delete asks first. Says where speech goes. Mic in your own language.

## New in v1.1
### Optional Severity
Severity is off by default. When enabled, it uses a 0-5 scale.

Severity is not priority. Severity means consequence if ignored.

Examples:
- S0: no special consequence
- S1: annoying
- S2: inconvenient
- S3: meaningful consequence
- S4: serious consequence
- S5: critical / do not ignore

### Optional TIMEBOUND
TIMEBOUND is off by default. When enabled, a due date/time applies deadline pressure.

Future deadlines increase pressure as the due moment approaches. Overdue tasks receive stronger pressure.

## Pressure Math
Base:
`B = Importance × Urgency × (1 + DaysOpen)`

Severity multiplier:
`M_s = 1 + Severity/5` when severity is enabled, otherwise `1`.

TIMEBOUND multiplier:
- Off: `M_t = 1`
- Future due: `M_t = 1 + closeness_to_due_window`
- Overdue: `M_t = 2 + min(days_overdue, 7) × 0.25`

Final:
`PS = round(B × M_s × M_t)`

Completed and killed tasks have pressure 0.

## Notes
This is intentionally not a bloated productivity app. It is a field-command instrument: capture the work, keep it visible, apply pressure until complete.
