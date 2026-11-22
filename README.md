# GTD Planner

A small, dependency-free Getting Things Done planner built around David Allen's
workflow. Everything runs in the browser and is saved to `localStorage`.

## Features

- **Inbox capture** — Quickly capture anything that has your attention, newest first.
- **Clarify with the two-minute rule** — Decide whether an item is actionable. If it
  takes under two minutes, do it now; otherwise turn it into a next action, project,
  waiting-for item, someday/maybe item, calendar entry, reference note, or trash it.
- **Next actions with contexts, priority, energy and time** — Each action has a
  context, a priority (`low`, `medium`, `high`), an energy level (`low`, `medium`,
  `high`) and an estimated time in minutes.
- **Projects with outcomes and the natural planning model** — Projects track a
  desired outcome and can be completed, reopened and flagged as stalled when they
  have no open action. Planning follows the five steps: Purpose & Principles,
  Vision & Outcome, Brainstorm, Organize, Next Actions.
- **Waiting-for** — Track delegated items with the person you are waiting on and an
  optional follow-up date; mark them received when they arrive.
- **Someday/maybe** — Park ideas that are not actionable now and activate them into
  next actions later.
- **Reference** — Keep non-actionable information with a searchable note.
- **Calendar and tickler** — Defer items to a date and see them grouped as today,
  upcoming and overdue; reactivate scheduled items into next actions.
- **Engage** — Filter active next actions by context, energy and available time,
  sorted by priority, to choose the best next action.
- **Weekly review** — Work through a checklist covering the inbox, next actions,
  projects without an open action, waiting-for, someday/maybe, calendar and areas;
  completed reviews are recorded with a snapshot and last-review timestamp.
- **Areas of focus** — Maintain ongoing responsibilities and assign projects to them.
- **Horizons of focus** — Capture purpose, principles, vision and goals, alongside
  live counts of areas, projects and next actions.
- **Context management** — Add and remove contexts safely; a context cannot be
  removed while active actions still use it.
- **Search** — Search inbox, actions, projects, waiting-for, someday/maybe,
  reference, calendar, areas and goals in one place.
- **Backup import/export** — Export the full planner state as JSON and import a
  validated backup to restore it.

## How to use

The planner follows the GTD loop: **capture → clarify → organize → reflect → engage**.

1. **Capture** — Add anything on your mind to the Inbox.
2. **Clarify** — Open an inbox item and decide what it is. If it takes under two
   minutes, do it immediately. Otherwise create a next action with a context, turn
   it into a project with a desired outcome, delegate it as waiting-for, defer it,
   file it as reference, or move it to someday/maybe.
3. **Organize** — Keep actions current by setting priority, energy and time.
   Group projects under areas of focus, fill in project planning, and keep the
   calendar/tickler up to date.
4. **Reflect** — Run the weekly review checklist to clear the inbox, review actions
   and waiting-for items, catch stalled projects, and revisit someday/maybe, the
   calendar and your areas.
5. **Engage** — Use the Engage view to filter next actions by context, energy and
   available time, then pick the best next action. Use Horizons of Focus to check
   that day-to-day work still supports your purpose, vision and goals.

Use Search to find anything across the lists, and Backup to export or import your
data as JSON.

## Run

```bash
npm start
# open http://localhost:4173
```

## Test

```bash
npm test
```

`npm test` runs the Node test suite with `node --test`. The app is
dependency-free and stores data in the browser's `localStorage`.
