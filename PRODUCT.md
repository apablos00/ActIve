# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
University students (Bachelor to PhD) preparing for exams, assignments or simply trying to understand a course. They sit at a laptop, usually alone, often in the evening, with their own lecture slides or readings as a PDF. Their job: actually understand the material instead of letting an AI read and think for them.

## Product Purpose
Sparring is a study app where a mentor voice asks instead of answers. The student uploads their material, Qwen turns it into a concept map, and a voice mentor (ElevenLabs agent, shown as a 3D hologram) drills them concept by concept with questions, hints and re-tests. Success means the student explains each concept correctly in their own words.

## Positioning
General AI tools hand students the answer. Sparring withholds it: a hint ladder (nudge, partial hint, explanation only after three real attempts, then re-test), built on the student's own slides and bridged to their own interests.

## Operating Context
- Oslo Sprint hackathon MVP (build window 7-8 Nov 2026), demoed live.
- One page app with steps: onboarding, library (PDF upload), voice session, summary.
- Voice session uses the mic; the student talks, the mentor speaks, the screen shows the current concept and question.
- Professor touchpoints are mocked (questions "sent to your professor").

## Capabilities and Constraints
- Stack: Next.js App Router, TypeScript, Tailwind, React Three Fiber, `@elevenlabs/react`, Qwen, localStorage, Vercel.
- Four teacher personalities: The Stickler, The Chill One, The Philosopher, The Enthusiast. Archetypes, never real people or real voices.
- Student side only. No teacher UI, no auth, no database.
- Keys stay server-side.

## Brand Commitments
- Name: Sparring.
- Minimalist UI, one focus per screen. One accent colour per mentor.
- The mentor is a 3D hologram.

## Evidence on Hand
Problem evidence in `Obsidian context/01 Problem and evidence.md` (OECD Digital Education Outlook 2026, HEPI 2026, WEF 2025). Demo lecture in `public/demo/lecture.json`. No users, testimonials or metrics yet; do not invent any.

## Product Principles
1. Ask before telling. The first move on every concept is a question.
2. The student does the thinking; the UI never shows answers ahead of the mentor.
3. Short turns: one question per turn.
4. Bridge everything to the student's own world.
5. One focus per screen.
