---
tags: [sparring, stage, must-have]
stage: 5
owner: A + C
---
# Stage 5: Hologram mentor

Back to [[00 Home]] · Prev: [[40 Mentor agent]] · Next: [[60 Summary and professor touchpoints]]

**Must-have 3 of 3.** A holographic mentor that comes alive with the ElevenLabs agent's voice. It moves the screen while it talks.

## The ski racer (demo flow)
Not a hologram. The Enthusiast (the demo mood) and the Stickler share a skier avatar: real talking footage cut out of its background (`public/avatars/skier-talking.*`, colour on top and mask below in each frame), waist-up from the first frame, on a transparent canvas over the real chalkboard (`components/SkierAvatar.tsx`). The footage plays while the agent's voice is present. When the voice stops it runs on to the next closed-mouth frame and rests there, breathing and blinking. His mouth follows the footage, not the agent's exact words. The other two teachers keep the 3D android hologram.

## The hologram
A stylized, semi-transparent bust of the chosen mentor. It floats above a light projector disc.
- **Look:** cyan glow in the mentor's accent color. Thin scanlines. Soft flicker. Particles rising from the disc.
- **Silhouettes:** Coach (cap and whistle), Founder (hoodie), Scientist (glasses). Archetypes, not real people.
- **Build:** SVG silhouette + CSS effects (glow, scanlines, flicker). One Canvas layer for particles. No 3D engine.

## States, driven by the agent
| State | Trigger | Animation |
|---|---|---|
| Idle | Before Start | Slow float, dim glow |
| Listening | Student speaks (`getInputVolume()`) | Disc ripples with the student's voice |
| Speaking | Agent speaks (`getOutputVolume()`, `getOutputByteFrequencyData()`) | Glow, mouth bar and particles pulse with the voice |
| Thinking | Client tool running | Scanlines speed up, short glitch |
| Celebrate | `update_mastery` with level 3 | Bright flash, particle burst |

Read the volumes in `requestAnimationFrame`. Smooth them so the hologram doesn't jitter.

## Screen
- Center: the hologram. It's the hero of the screen.
- Left: concept list with mastery bars.
- Right: current concept card and question card.
- Bottom: Start / End. Chip area for "Sent to your professor".
- Dark background so the hologram glows.

## Client tools
Same names in the ElevenLabs dashboard and in code.

| Name | Params | UI effect |
|---|---|---|
| `show_concept` | `concept_id` | Opens the concept card |
| `show_question` | `text` | Shows the question on screen |
| `update_mastery` | `concept_id`, `level` (0-3) | Mastery bar fills. Level 3 triggers Celebrate. |
| `flag_for_professor` | `question` | Adds "Sent to your professor" chip |
| `end_session` | `mastered[]`, `review[]`, `answer_requests`, `own_explanations` | Opens the summary |

## Sketch
```tsx
const conversation = useConversation({
  clientTools: {
    show_concept: async ({ concept_id }) => { focus(concept_id); return "ok"; },
    update_mastery: async ({ concept_id, level }) => { setMastery(concept_id, level); return "ok"; },
    // ...rest of the table
  },
});

await conversation.startSession({
  agentId,
  connectionType: "webrtc",
  dynamicVariables: buildVars(profile, conceptMap), // all strings
});

// Hologram loop
function tick() {
  hologram.speak(smooth(conversation.getOutputVolume()));
  hologram.listen(smooth(conversation.getInputVolume()));
  requestAnimationFrame(tick);
}
```
Verify against the current SDK docs.

## Dynamic variables
`student_name`, `course`, `hobbies`, `career_goal`, `challenge`, `material_title`, `main_ideas`, `concepts`, `professor_name`.
`concepts` is one line per concept: `id | name | explanation | misconception | bridge | pages`.

## Build order
1. Static hologram with idle float (no agent)
2. Connect the agent. Speaking state from output volume.
3. Listening state from input volume
4. Client tools wired to the UI
5. Thinking and Celebrate states

## Done when
- [ ] Hologram floats, glows and flickers
- [ ] It pulses with the mentor's voice and ripples with the student's
- [ ] All five tools change the UI
- [ ] Session starts from the library
