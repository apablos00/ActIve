---
version: 1
slug: "components-session-tsx"
primary_target: "components/Session.tsx"
related_targets: ["components/Hologram.tsx"]
---

# Voice session screen

Scope: `components/Session.tsx` (+ `components/Hologram.tsx` background). Mode: Operate.
Task: talk with the mentor, see which concept is open, read the current question, control mic and volume, hear a concept explained, end the session.
Constraints: keep every function (client tools, mastery bars, professor chips, voice controls, play button, start/end, errors). Mentor accent colour stays the mentor's identity.

## Direction contract
THESIS: An evening classroom with a hologram teacher. Tech lives in the hologram; everything the student reads lives on classroom objects. Refuses the dark dashboard with glowing side panels.
OWN-WORLD: Dark classroom ground (green-black), slate-green chalkboard in a worn wooden frame with chalk dust, white and yellow chalk lettering, cream index cards with a red header rule and faint blue lines, a wooden chalk ledge. Mentor accent appears as pushpin, chalk underline and hologram glow only.
STORY: The student sees the teacher, sees where they are in the lesson, reads the question on the board, answers out loud.
FIRST VIEWPORT: Left 280px: lesson cards stack, current card lifted and pinned. Centre: hologram on its projector. Right ~400px: chalkboard with today's lesson title, concept name, page ref, bridge, play-to-explain, then the question in yellow chalk. Bottom: wooden ledge with Start/End, mic and volume controls, professor notes.
FORM: Pinned by the user (green chalkboard, whole classroom, live chalk writing). seed: none (direction pinned by user)
Signature move: the mentor's question writes itself on the board character by character in chalk; a concept change erases the board with a smudge first. Reduced motion shows text instantly.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
