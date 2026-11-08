---
tags: [sparring, stage, must-have]
stage: 2
owner: A
---
# Stage 2: Onboarding

Back to [[00 Home]] · Prev: [[10 Setup]] · Next: [[30 Document processing]]

**Must-have 1 of 3.** Learn who the student is in under 45 seconds. Everything later is personalised from this. Mostly taps, one optional free-text box.

## Flow
Three steps side by side on one page, styled like the classroom: steps 1-2 are paper student cards, step 3 is a small chalkboard. The current step is lifted and pinned; the others sit in shadow.
Rule: anything with a known set of answers is a pick list (handwritten chips, highlighted when picked). Only truly free answers are text inputs, and they get a placeholder only when the answer is not obvious.
Rule: each step shows one part at a time. Answering a part writes the next one onto the card, in space it has held from the start, so nothing moves. The step's button comes last. Saved profiles come back already written.
Interest and hobby chips each carry a small line icon (`lucide-react`).
1. **Get to know you.** Name, surname (text, no placeholder). Areas of interest and hobbies (pick any, 7-8 broad options each).
2. **Your uni.** University (UiO, BI, OsloMet, Kristiania, Other). Study programme (9 basic options). Level (Bachelor / Master). Year (Bachelor: 1st-3rd, Master: 4th-5th). Course studying now (text, placeholder "For example, Statistics 1").
3. **Pick your mood.** One of four teacher personalities, each shown as a big chalk face. The Enthusiast comes first and is picked by default. Clicking a face goes straight to the upload screen.

Moving between steps is handwritten: "Continue" and "Back" links with a drawn arrow, no web-style buttons. Choice lists live in `lib/types.ts`.

## Data
```ts
type StudentProfile = {
  firstName: string;
  lastName: string;
  interests: string[];  // from INTERESTS
  hobbies: string[];    // from HOBBIES
  university: "uio" | "bi" | "oslomet" | "kristiania" | "other" | "";
  programme: string;    // from PROGRAMMES
  level: string;        // Bachelor | Master
  year: string;         // Bachelor: 1st | 2nd | 3rd. Master: 4th | 5th
  course: string;
  mentor: "stickler" | "chill" | "philosopher" | "enthusiast";
};
```
Saved to localStorage. Prefilled on reload (old values that no longer match a choice are dropped).

## Where it's used
- [[30 Document processing]]: Qwen writes a bridge per concept from academic interests, hobbies and programme.
- [[50 Hologram mentor]]: sent to the agent as dynamic variables. Picks the hologram and voice.

## Teachers
| Teacher | Style | Accent |
|---|---|---|
| The Stickler | Strict and precise. "Define your terms." | Rose |
| The Chill One | Relaxed and warm. "No stress, walk me through it." | Emerald |
| The Philosopher | Slow and deep. "But why is that true?" | Violet |
| The Enthusiast | Loves the subject. "Isn't this wild?!" | Amber |

Each hologram has its own prop: glasses, headphones, beard, wild hair. Brains live in `lib/brains/<id>.md`.

## Done when
- [ ] Three steps work in under 45 seconds
- [ ] Profile saves and prefills on reload
