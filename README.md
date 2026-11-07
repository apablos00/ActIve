# Sparring

A mentor voice that asks instead of answers. Single page Next.js app.

## Run it locally

1. **Install**
   ```bash
   cd web
   npm install
   ```

2. **Keys** go in `web/.env.local` (git-ignored, never commit it)
   - `QWEN_API_KEY`: Alibaba Cloud Model Studio console → API keys. Set `QWEN_BASE_URL` to the same region as the key (Singapore is prefilled). `QWEN_MODEL` defaults to `qwen-plus`.
   - `ELEVENLABS_API_KEY`: elevenlabs.io → Developers → API keys. Give it **ElevenAgents: write** and **Voices: read**. Only the setup script uses it. The app runs on public agent IDs.

3. **Create the mentor agents** (Coach, Founder, Scientist, plus 5 client tools)
   ```bash
   npm run setup:agents          # or: npm run setup:agents -- coach
   ```
   This writes `NEXT_PUBLIC_AGENT_*_ID` into `.env.local`. Re-run it after editing `lib/brains/*.md`.
   To choose voices: `npm run setup:agents -- --voices`, then set `ELEVENLABS_VOICE_COACH=<id>` (or `_FOUNDER`, `_SCIENTIST`) and re-run.

4. **Check everything**
   ```bash
   npm run check
   ```

5. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Use Chrome and allow the microphone. Restart `npm run dev` whenever `.env.local` changes.

## The loop
Onboarding → upload a PDF (Qwen builds the concept map) or "Import from Canvas" (demo JSON, no Qwen needed) → Start session → talk to the hologram.

## Files
- `app/page.tsx`: the single page, `step` state
- `app/api/extract/route.ts`: PDF → unpdf → Qwen → zod → ConceptMap
- `components/Hologram.tsx`: 3D hologram (R3F + postprocessing). Put a GLB path in `MODEL_URLS` to replace the built-in bust.
- `components/Session.tsx`: ElevenLabs session, client tools, session layout
- `lib/brains/`: mentor brains + `agent-prompt.md` (the system prompt template)
- `scripts/`: `setup-agents.mjs`, `check.mjs`
