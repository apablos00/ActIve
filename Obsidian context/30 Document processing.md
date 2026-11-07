---
tags: [sparring, stage, must-have]
stage: 3
owner: B
---
# Stage 3: Document processing

Back to [[00 Home]] · Prev: [[20 Onboarding]] · Next: [[40 Mentor agent]]

**Must-have 2 of 3.** A PDF goes in. Qwen turns it into main ideas and personal concepts in under 60 seconds.

## Flow
```
PDF upload
 -> /api/extract
 -> unpdf: text per page, [p.N] markers
 -> Qwen (Alibaba Cloud Model Studio, OpenAI-compatible) with the student profile
 -> zod validation
 -> ConceptMap -> localStorage
```

## Qwen setup
- Endpoint and current **Plus** model ID from the Model Studio console.
- `openai` npm SDK with `baseURL` set to Qwen.
- JSON mode on. Temperature low (0.2).
- Fallback: same code through OpenRouter.

## Schema
```ts
type Concept = {
  id: string;            // "c1"
  name: string;
  explanation: string;   // max 60 words, source only
  pages: number[];
  misconception: string; // real trap
  bridge: string;        // analogy from hobby or career
};

type ConceptMap = {
  id: string;
  title: string;
  mainIdeas: string[];   // 3
  concepts: Concept[];   // 5-8
};
```

## Prompt
```
SYSTEM
You are a learning designer. Return JSON matching the ConceptMap schema. Nothing else.
Use only the material. Cite page numbers for every concept.
3 main ideas, max 20 words each. 5-8 concepts, simplest first.
Each misconception is a real trap a student would fall into.
Each bridge is an accurate analogy from the student's hobbies or career goal. Max 30 words.

USER
Student: <StudentProfile>
Material: <text with [p.N] before each page, capped at ~60 pages>
```
If zod fails, retry once with the error message appended.

## Library UI
- Drag and drop PDF. Progress line: "Reading", "Finding concepts", "Making it yours".
- "Import from Canvas" button loads `/data/demo/lecture.json`. Mock. See [[60 Summary and professor touchpoints]].
- Shows title, 3 main ideas and the concept list with bridges. Button: "Start session".

## Backup
Save the demo lecture result as `/data/demo/lecture.json`. Use it if Wi-Fi or Qwen fails.

## Done when
- [ ] Two real PDFs parse correctly
- [ ] Output always passes zod
- [ ] Bridges mention the student's own hobbies
- [ ] Demo JSON saved
