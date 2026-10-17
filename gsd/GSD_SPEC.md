# GSD PRODUCT SPEC v1.1.1 SIR

## Mission
GSD exists to convert messy human intent into visible work pressure.

## The question
What do you want to do? What do you need to get done?

## Core Voice Inputs
- “Shit I want done today.”
- “Shit I have to do today.”
- “Shit I want done this week.”
- “Shit I have to do this month.”
- “Reminder, this shit needs to get done.”

## Objects
Task T = {title, horizon, category (a lane you name), importance, urgency, severityEnabled, severity, timeboundEnabled, dueAt, status, createdAt, completedAt}

Horizon H ∈ {today, week, month}
Status S ∈ {open, working, done, killed}
Severity V ∈ {0,1,2,3,4,5}

## Pressure Equation v1.1

Base pressure:
B(T) = I × U × (1 + A)

Where:
I = importance from 1-10
U = urgency from 1-10
A = full days open

Severity multiplier:
M_s(T) = 1 + V/5 if severityEnabled, else 1

TIMEBOUND multiplier:
M_t(T) = 1 if no dueAt or timebound disabled

If dueAt is in the future:
M_t(T) = 1 + C
C = 1 - clamp(hoursLeft / W_H, 0, 1)

Horizon windows:
W_today = 24h
W_week = 168h
W_month = 720h

If overdue:
M_t(T) = 2 + min(hoursOverdue / 24, 7) × 0.25

Final pressure:
PS(T) = round(B(T) × M_s(T) × M_t(T))

If status ∈ {done, killed}, PS = 0.

## Severity Doctrine
Severity is consequence, not priority.

- Importance asks: does this matter?
- Urgency asks: how soon?
- Age asks: how long has this been sitting?
- Severity asks: what happens if this stays undone?
- TIMEBOUND asks: is the clock becoming dangerous?

## TIMEBOUND Doctrine
TIMEBOUND is optional because not every task deserves a deadline.
Fake deadlines create noise.
Real deadlines create useful pressure.

## Completion Doctrine
Do not reward hoarding tasks. Reward completion and clean killing.
Done creates receipt.
Killed removes false obligation.
Open creates pressure.
Working creates attention.
Severity prevents consequence blindness.
TIMEBOUND prevents deadline drift.

## v1.2 Upgrade Path
- Edit task modal
- Recurring tasks
- Local notification scheduler
- PULSE/DAILY COMMAND LAYER import/export
- Calendar bridge
- Project lanes
- End-of-week review
- Mobile wrapper
