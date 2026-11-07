---
tags: [sparring, stage, must-have]
stage: 2
owner: A
---
# Stage 2: Onboarding

Back to [[00 Home]] · Prev: [[10 Setup]] · Next: [[30 Document processing]]

**Must-have 1 of 3.** Learn who the student is in under 30 seconds. Everything later is personalised from this.

## Flow
Three short steps. One question block per screen.
1. **You.** Name, course.
2. **Your world.** Hobbies (chips + free text), career goal.
3. **Your mentor.** Pick Coach, Founder or Scientist. Pick challenge level 1-3.

Then "Continue" to `/library`.

## Data
```ts
type StudentProfile = {
  name: string;
  course: string;
  hobbies: string[];
  careerGoal: string;
  mentor: "coach" | "founder" | "scientist";
  challenge: 1 | 2 | 3;   // 1 gentle, 3 relentless
};
```
Saved to localStorage. Prefilled on reload.

## Where it's used
- [[30 Document processing]]: Qwen writes a bridge per concept from hobbies and career goal.
- [[50 Hologram mentor]]: sent to the agent as dynamic variables. Picks the hologram and voice.

## Mentors
| Mentor | Style | Accent |
|---|---|---|
| Coach | Football coach before a final. High energy. Sports analogies. | Cyan |
| Founder | Impatient founder. "So what? Who pays?" | Amber |
| Scientist | Calm researcher. "How would you test that?" | Violet |

Mentor cards show a small static preview of each hologram.

## Done when
- [ ] Three steps work in under 30 seconds
- [ ] Profile saves and prefills on reload
