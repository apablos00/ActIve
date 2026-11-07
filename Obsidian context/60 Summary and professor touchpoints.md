---
tags: [sparring, stage]
stage: 6
owner: A + B
---
# Stage 6: Summary and professor touchpoints

Back to [[00 Home]] · Prev: [[50 Hologram mentor]] · Next: [[70 Deploy and demo]]

**Goal.** Show what the student learned. Show that the professor stays in the loop.

## Summary
Triggered by `end_session`.
- Mastered concepts
- To review
- Thinking Score (0-100)
- Questions sent to the professor
- Button: "Share with professor" (mock: shows "Shared")

```ts
type SessionResult = {
  mastery: Record<string, 0 | 1 | 2 | 3>;
  review: string[];
  flagged: string[];
  answerRequests: number;
  ownExplanations: number;
  thinkingScore: number;
};
```

## Thinking Score
```
score = 40 * (avg mastery / 3)
      + 30 * min(own_explanations, 5) / 5
      + 30 * (1 - min(answer_requests, 5) / 5)
```

## Professor touchpoints (all mocked, student side only)
1. **Import from Canvas.** Button on the library page. Loads the demo lecture with a "From Canvas" label.
2. **Flag for professor.** Mentor calls `flag_for_professor`. Chip: "Sent to your professor".
3. **Share with professor.** Button on the summary.

No teacher profile. No teacher UI.

## Done when
- [ ] Summary appears after every session
- [ ] A flagged question shows as sent
