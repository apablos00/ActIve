// Creates (or updates) the three Sparring mentor agents in ElevenLabs and
// writes their IDs into .env.local. Safe to re-run: existing agents are patched.
//
//   npm run setup:agents              all three mentors
//   npm run setup:agents -- coach     only the Coach
//   npm run setup:agents -- --voices  list premade voices and exit
//
// Optional env: AGENT_LLM (default gemini-2.5-flash),
// ELEVENLABS_VOICE_COACH / _FOUNDER / _SCIENTIST (voice IDs).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(ROOT, ".env.local");
const API = "https://api.elevenlabs.io";
const KEY = process.env.ELEVENLABS_API_KEY;
const LLM = process.env.AGENT_LLM || "gemini-2.5-flash";

const MENTORS = {
  coach: {
    name: "Sparring Coach",
    firstMessage: "{{student_name}}! Final's today: {{material_title}}. Ready for the first play?",
    voice: { gender: "male", ages: ["middle_aged", "middle aged", "old"] },
  },
  founder: {
    name: "Sparring Founder",
    firstMessage: "{{student_name}}. {{material_title}}. You've got twenty minutes to convince me you get it. Ready?",
    voice: { gender: "female", ages: ["young", "middle_aged", "middle aged"] },
  },
  scientist: {
    name: "Sparring Scientist",
    firstMessage: "Hello {{student_name}}. Today we test what you really know about {{material_title}}. Shall we start?",
    voice: { gender: "male", ages: ["young", "middle_aged", "middle aged"] },
  },
};

// Names must match the clientTools in components/Session.tsx.
const str = (description) => ({ type: "string", description });
const int = (description) => ({ type: "integer", description });
const TOOLS = [
  {
    name: "show_concept",
    description: "Open the concept card on the student's screen. Call before starting each concept.",
    properties: { concept_id: str('Concept id like "c1"') },
  },
  {
    name: "show_question",
    description: "Show your current question as text on the student's screen.",
    properties: { text: str("The question, word for word") },
  },
  {
    name: "update_mastery",
    description:
      "Set how well the student has mastered a concept. 1 = partial, 2 = explained with help, 3 = explained correctly in their own words.",
    properties: { concept_id: str('Concept id like "c1"'), level: int("Mastery level from 0 to 3") },
  },
  {
    name: "flag_for_professor",
    description: "Send a question the student is stuck on to their professor. Only after the full hint ladder and the student agrees.",
    properties: { question: str("The student's question in one sentence") },
  },
  {
    name: "end_session",
    description: "End the session and show the summary. Call after the three recall questions.",
    properties: {
      mastered: str('Comma-separated concept ids at level 3, e.g. "c1,c3"'),
      review: str('Comma-separated concept ids to review, e.g. "c2,c4"'),
      answer_requests: int("How many times the student asked for the answer"),
      own_explanations: int("How many times the student explained a concept in their own words"),
    },
  },
];

// ---------- helpers ----------
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${text}`);
  return text ? JSON.parse(text) : {};
}

function readEnv() {
  return readFileSync(ENV_FILE, "utf8");
}

function setEnv(key, value) {
  let env = readEnv();
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  env = re.test(env) ? env.replace(re, line) : env.trimEnd() + `\n${line}\n`;
  writeFileSync(ENV_FILE, env);
  process.env[key] = value;
}

// Same format as dynamicVariables() in components/Session.tsx,
// filled from the demo lecture so dashboard tests work.
function placeholders() {
  const map = JSON.parse(readFileSync(join(ROOT, "public/demo/lecture.json"), "utf8"));
  return {
    student_name: "Alex",
    course: "Intro to Microeconomics",
    hobbies: "Football, Gaming",
    career_goal: "Start my own company",
    challenge: 2,
    professor_name: "Professor Berg",
    material_title: map.title,
    main_ideas: map.mainIdeas.map((m, i) => `${i + 1}. ${m}`).join(" "),
    concepts: map.concepts
      .map((c) => [c.id, c.name, c.explanation, c.misconception, c.bridge, `p.${c.pages.join(",")}`].join(" | "))
      .join("\n"),
  };
}

function buildPrompt(mentor) {
  const template = readFileSync(join(ROOT, "lib/brains/agent-prompt.md"), "utf8");
  const brain = readFileSync(join(ROOT, `lib/brains/${mentor}.md`), "utf8").trim();
  return template.replace("<<BRAIN>>", brain);
}

async function premadeVoices() {
  try {
    const { voices } = await api("GET", "/v2/voices?category=premade&page_size=100");
    return voices ?? [];
  } catch (e) {
    console.warn("! Could not list voices (key needs Voices read). Using the default voice.\n ", e.message.split("\n")[0]);
    return [];
  }
}

function pickVoice(mentor, voices, taken) {
  const fromEnv = process.env[`ELEVENLABS_VOICE_${mentor.toUpperCase()}`];
  if (fromEnv) return { voice_id: fromEnv, name: "(from env)" };
  const want = MENTORS[mentor].voice;
  const free = voices.filter((v) => !taken.has(v.voice_id));
  const match =
    free.find((v) => v.labels?.gender === want.gender && want.ages.includes(v.labels?.age)) ??
    free.find((v) => v.labels?.gender === want.gender) ??
    free[0];
  return match ? { voice_id: match.voice_id, name: match.name } : null;
}

// ---------- main ----------
if (!KEY) {
  console.error("ELEVENLABS_API_KEY is empty in web/.env.local. Add it and re-run.");
  process.exit(1);
}

const args = process.argv.slice(2);

if (args.includes("--voices")) {
  for (const v of await premadeVoices()) {
    const l = v.labels ?? {};
    console.log(`${v.voice_id}  ${v.name.padEnd(12)} ${[l.gender, l.age, l.accent, l.description].filter(Boolean).join(", ")}`);
  }
  process.exit(0);
}

const targets = args.filter((a) => a in MENTORS);
const mentors = targets.length ? targets : Object.keys(MENTORS);

// 1. Client tools: created once, IDs remembered in .env.local.
const saved = Object.fromEntries(
  (process.env.ELEVENLABS_TOOL_IDS ?? "")
    .split(",")
    .filter(Boolean)
    .map((p) => p.split(":")),
);
const toolIds = [];
for (const t of TOOLS) {
  if (!saved[t.name]) {
    const res = await api("POST", "/v1/convai/tools", {
      tool_config: {
        type: "client",
        name: t.name,
        description: t.description,
        expects_response: false,
        parameters: { type: "object", properties: t.properties, required: Object.keys(t.properties) },
      },
    });
    saved[t.name] = res.id;
    console.log(`+ tool ${t.name} (${res.id})`);
  } else {
    console.log(`= tool ${t.name} (${saved[t.name]})`);
  }
  toolIds.push(saved[t.name]);
}
setEnv("ELEVENLABS_TOOL_IDS", Object.entries(saved).map(([k, v]) => `${k}:${v}`).join(","));

// 2. Agents: create or patch, then store the ID.
const voices = await premadeVoices();
const taken = new Set();
const dynamicPlaceholders = placeholders();

for (const mentor of mentors) {
  const m = MENTORS[mentor];
  const voice = pickVoice(mentor, voices, taken);
  if (voice) taken.add(voice.voice_id);

  const body = {
    name: m.name,
    conversation_config: {
      agent: {
        first_message: m.firstMessage,
        language: "en",
        prompt: { prompt: buildPrompt(mentor), llm: LLM, temperature: 0.5, tool_ids: toolIds },
        dynamic_variables: { dynamic_variable_placeholders: dynamicPlaceholders },
      },
      tts: { model_id: "eleven_v3_conversational", expressive_mode: true, ...(voice && { voice_id: voice.voice_id }) },
      turn: { turn_eagerness: "patient" },
    },
    platform_settings: { auth: { enable_auth: false } },
  };

  const envKey = `NEXT_PUBLIC_AGENT_${mentor.toUpperCase()}_ID`;
  const existing = process.env[envKey];
  let id = existing;
  if (existing) {
    try {
      await api("PATCH", `/v1/convai/agents/${existing}`, body);
    } catch (e) {
      if (!String(e.message).includes("404")) throw e;
      id = null; // deleted in the dashboard: create a fresh one
    }
  }
  if (!id) id = (await api("POST", "/v1/convai/agents/create", body)).agent_id;
  setEnv(envKey, id);
  console.log(`${existing === id ? "~ updated" : "+ created"} ${m.name} (${id}) voice: ${voice?.name ?? "default"}, llm: ${LLM}`);
}

console.log("\nDone. Restart `npm run dev` so the new agent IDs reach the browser.");
