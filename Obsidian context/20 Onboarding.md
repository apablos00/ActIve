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
1. **Get to know you.** Name, surname (text, no placeholder). Areas of interest and hobbies (pick any, 7-8 broad options each).
2. **Your uni.** University (UiO, BI, OsloMet, Kristiania). Study programme (9 basic options). Level (Bachelor / Master / PhD). Year (1st-4th+). Course studying now (text, placeholder "For example, Statistics 1").
3. **Your teacher.** Pick one of four teacher personalities.

Then "Start with <teacher>" to `/library`. Choice lists live in `lib/types.ts`.

## Data
```ts
type StudentProfile = {
  firstName: string;
  lastName: string;
  interests: string[];  // from INTERESTS
  hobbies: string[];    // from HOBBIES
  university: "uio" | "bi" | "oslomet" | "kristiania" | "";
  programme: string;    // from PROGRAMMES
  level: string;        // Bachelor | Master | PhD
  year: string;         // 1st | 2nd | 3rd | 4th+
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
