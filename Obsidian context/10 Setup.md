---
tags: [sparring, stage]
stage: 1
owner: all
---
# Stage 1: Setup

Back to [[00 Home]] · Next: [[20 Onboarding]]

**Goal.** Everyone can run the app locally by 09:30.

## Stack
| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript |
| UI | Tailwind + shadcn/ui + Hologram avatar (SVG + CSS + Canvas) |
| Voice | `@elevenlabs/react`, WebRTC |
| LLM | Qwen on Alibaba Cloud Model Studio, OpenAI-compatible, `openai` npm SDK. Fallback: OpenRouter. |
| PDF | `unpdf` on the server |
| Validation | `zod` |
| Storage | localStorage |
| Deploy | Vercel |

## Folders
```
/app
  page.tsx                 profile
  library/page.tsx         upload, Canvas mock, concept list
  study/[id]/page.tsx      session + summary
  api/extract/route.ts     PDF -> Qwen -> ConceptMap
/lib     qwen.ts  pdf.ts  schemas.ts  storage.ts  mentors.ts
/agent   prompt.md  client-tools.md
/data/demo  lecture.pdf  lecture.json
```

## Env
```
QWEN_API_KEY=
QWEN_BASE_URL=
QWEN_MODEL=
NEXT_PUBLIC_AGENT_COACH_ID=
NEXT_PUBLIC_AGENT_FOUNDER_ID=
NEXT_PUBLIC_AGENT_SCIENTIST_ID=
```
Copy the Qwen base URL and current Plus model ID from the Model Studio console. Never commit `.env`.

## Done when
- [ ] Repo cloned by all three
- [ ] `npm run dev` shows a blank page
- [ ] `.env.local` filled on every laptop
