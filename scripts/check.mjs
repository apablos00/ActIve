// Checks that local keys work before you open the app.
//   npm run check

const ok = (msg) => console.log(`✓ ${msg}`);
const bad = (msg) => console.log(`✗ ${msg}`);
let failed = false;

// ---------- Qwen ----------
const { QWEN_API_KEY, QWEN_BASE_URL, QWEN_MODEL } = process.env;
if (!QWEN_API_KEY || !QWEN_BASE_URL || !QWEN_MODEL) {
  bad("Qwen: set QWEN_API_KEY, QWEN_BASE_URL and QWEN_MODEL in .env.local");
  failed = true;
} else {
  const t0 = Date.now();
  try {
    // Same settings as app/api/extract/route.ts.
    const res = await fetch(`${QWEN_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${QWEN_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [{ role: "user", content: 'Return this JSON exactly: {"ok": true}' }],
        temperature: 0.2,
        response_format: { type: "json_object" },
        enable_thinking: false,
      }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 300)}`);
    const content = JSON.parse(body).choices?.[0]?.message?.content ?? "";
    JSON.parse(content);
    ok(`Qwen: ${QWEN_MODEL} answered valid JSON in ${Date.now() - t0} ms`);
  } catch (e) {
    bad(`Qwen: ${e.message}`);
    if (String(e.message).includes("401") || String(e.message).includes("403"))
      console.log("  Hint: the base URL region must match the region your API key was created in.");
    failed = true;
  }
}

// ---------- ElevenLabs agents ----------
const key = process.env.ELEVENLABS_API_KEY;
for (const mentor of ["coach", "founder", "scientist"]) {
  const id = process.env[`NEXT_PUBLIC_AGENT_${mentor.toUpperCase()}_ID`];
  if (!id) {
    bad(`Agent ${mentor}: no ID. Run \`npm run setup:agents\``);
    if (mentor === "coach") failed = true;
    continue;
  }
  if (!key) {
    ok(`Agent ${mentor}: ID set (add ELEVENLABS_API_KEY to verify it)`);
    continue;
  }
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, { headers: { "xi-api-key": key } });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    const a = await res.json();
    const cfg = a.conversation_config ?? {};
    const tools = cfg.agent?.prompt?.tool_ids?.length ?? 0;
    const pub = !a.platform_settings?.auth?.enable_auth;
    const msg = `Agent ${mentor}: "${a.name}", tts ${cfg.tts?.model_id}, ${tools} tools, ${pub ? "public" : "AUTH ON (app can't connect)"}`;
    if (tools === 5 && pub) ok(msg);
    else {
      bad(msg);
      failed = true;
    }
  } catch (e) {
    bad(`Agent ${mentor}: ${e.message}`);
    failed = true;
  }
}

if (failed) {
  console.log("\nFix the ✗ lines above.");
  process.exit(1);
}
console.log("\nAll good. Run `npm run dev` and open http://localhost:3000");
