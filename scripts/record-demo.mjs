// Records the demo up to the voice part: onboarding as Markus, the Canvas
// import, the concept map, and the session screen with the mentor ready.
// Then the window stays open so you can press Start and talk live.
//
//   npm run build && npm start        (in one terminal; dev mode stutters)
//   npm run record:demo               (in another)
//
// Options (env): DEMO_URL (default http://localhost:3000), MENTOR (chill |
// stickler | philosopher | enthusiast), HEADLESS=1 (record only, no hand-off).
// Output: recordings/markus-demo.mp4

import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const URL = process.env.DEMO_URL ?? "http://localhost:3000";
const MENTOR = { chill: "The Chill One", stickler: "The Stickler", philosopher: "The Philosopher", enthusiast: "The Enthusiast" }[
  process.env.MENTOR ?? "enthusiast"
];
const HEADLESS = process.env.HEADLESS === "1";
const W = 1920;
const H = 1080;
const OUT = path.resolve("recordings", "markus-demo.mp4");
let mouse = { x: W / 2, y: H * 0.8 }; // where glide() starts from

const MARKUS = {
  firstName: "Markus",
  lastName: "Pedersen",
  interests: ["Business and economics"],
  hobbies: ["Skiing", "Outdoors"],
  university: "BI",
  programme: "Business management",
  level: "Bachelor",
  year: "1st",
  course: "Mathematics",
};

if (!MENTOR) throw new Error("MENTOR must be chill, stickler, philosopher or enthusiast");
try {
  await fetch(URL);
} catch {
  console.error(`Nothing is running at ${URL}. Start the app first: npm run build && npm start`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: HEADLESS, args: [`--window-size=${W},${H + 120}`] });
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await context.grantPermissions(["microphone"], { origin: new globalThis.URL(URL).origin });
await context.addInitScript(cursorOverlay);
const page = await context.newPage();

// Load and let fonts settle before the camera rolls.
await page.goto(URL, { waitUntil: "networkidle" });
await page.getByLabel("Name", { exact: true }).waitFor();
await page.mouse.move(W / 2, H * 0.8);
await page.waitForTimeout(800);

const rec = await startRecording(page);

// ---- 1. Get to know you ----
await pause(1200);
await type(page.getByLabel("Name", { exact: true }), MARKUS.firstName);
await type(page.getByLabel("Surname", { exact: true }), MARKUS.lastName);
for (const v of MARKUS.interests) await click(page.getByRole("button", { name: v, exact: true }));
for (const v of MARKUS.hobbies) await click(page.getByRole("button", { name: v, exact: true }));
await pause(600);
await click(page.getByRole("button", { name: "Continue" }));
await pause(900);

// ---- 2. Your uni ----
await click(page.getByRole("radio", { name: MARKUS.university, exact: true }));
await click(page.getByRole("radio", { name: MARKUS.programme, exact: true }));
await click(page.getByRole("radio", { name: MARKUS.level, exact: true }));
await click(page.getByRole("radio", { name: MARKUS.year, exact: true }));
await type(page.getByLabel("Course you're studying now"), MARKUS.course);
await pause(600);
await click(page.getByRole("button", { name: "Continue" }));
await pause(1000);

// ---- 3. Pick your mood ----
await click(page.getByRole("button", { name: new RegExp(MENTOR) }));

// ---- 4. Library: import the lecture from Canvas ----
await pause(1200);
await click(page.getByRole("button", { name: "Import from Canvas" }));
const deck = page.getByRole("button", { name: /Lecture 4/ });
await deck.waitFor();
await pause(1100);
await click(deck);
await pause(500);
await click(page.getByRole("button", { name: "Import to Sparring" }));

// ---- 5. Concept map: let it be read ----
const startSession = page.getByRole("button", { name: "Start session" });
await startSession.waitFor({ timeout: 15000 });
await pause(2500);
await glide(page, W * 0.5, H * 0.55);
await scroll(page, 500);
await pause(2200);
await click(startSession);

// ---- 6. Session: the mentor is drawn in, ready to talk ----
const talk = page.getByRole("button", { name: /^Start talking to/ });
await talk.waitFor();
await pause(3500); // the teacher fades in on the board
await hover(talk);
await pause(2000);

await rec.stop();
console.log(`Saved ${OUT}`);

if (HEADLESS) {
  await browser.close();
} else {
  console.log("\nThe window is yours now. Press “Start talking” and do the voice part live.");
  console.log("Record it with Win+Alt+R (Game Bar) so the audio is captured. Close the window when done.");
  await page.waitForEvent("close", { timeout: 0 }).catch(() => {});
  await browser.close().catch(() => {});
}

// ---------- helpers ----------

function pause(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Move the mouse along a curve instead of teleporting, so the cursor reads.
async function glide(p, x, y) {
  const steps = Math.max(12, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 22));
  const bend = (Math.random() - 0.5) * 80;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await p.mouse.move(mouse.x + (x - mouse.x) * e + Math.sin(Math.PI * t) * bend, mouse.y + (y - mouse.y) * e);
    await pause(8);
  }
  mouse = { x, y };
}

async function center(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Not visible: ${locator}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function hover(locator) {
  const c = await center(locator);
  await glide(page, c.x, c.y);
}

async function click(locator) {
  await hover(locator);
  await pause(180);
  await page.mouse.down();
  await pause(70);
  await page.mouse.up();
  await pause(380);
}

async function type(locator, text) {
  await click(locator);
  await locator.pressSequentially(text, { delay: 85 });
  await pause(350);
}

async function scroll(p, dy) {
  for (let i = 0; i < 10; i++) {
    await p.mouse.wheel(0, dy / 10);
    await pause(35);
  }
}

// Chrome's screencast gives sharp JPEG frames with timestamps; ffmpeg turns
// them into a constant 30 fps H.264 file.
async function startRecording(p) {
  const dir = await mkdtemp(path.join(tmpdir(), "sparring-demo-"));
  const cdp = await p.context().newCDPSession(p);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `${String(frames.length).padStart(6, "0")}.jpg`);
    frames.push({ file, t: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    await writeFile(file, Buffer.from(data, "base64"));
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  return {
    async stop() {
      await cdp.send("Page.stopScreencast");
      await pause(300); // let the last writes land
      if (frames.length < 2) throw new Error("No frames were captured.");
      const lines = [];
      frames.forEach((f, i) => {
        const next = frames[i + 1]?.t ?? f.t + 0.5;
        lines.push(`file '${f.file.replaceAll("\\", "/")}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
      });
      lines.push(`file '${frames.at(-1).file.replaceAll("\\", "/")}'`);
      const list = path.join(dir, "frames.txt");
      await writeFile(list, lines.join("\n"));
      await mkdir(path.dirname(OUT), { recursive: true });
      await run(ffmpegPath, [
        "-y", "-f", "concat", "-safe", "0", "-i", list,
        "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,fps=30`,
        "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT,
      ]);
      await rm(dir, { recursive: true, force: true });
    },
  };
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed:\n${err.slice(-2000)}`))));
  });
}

// Runs inside the page: a visible cursor with a click ripple, since
// screencasts don't include the system pointer.
function cursorOverlay() {
  const install = () => {
    const style = document.createElement("style");
    style.textContent = `
      #demo-cursor{position:fixed;left:0;top:0;width:22px;height:22px;margin:-3px 0 0 -3px;z-index:2147483647;pointer-events:none;
        background:url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l15 9-6.5 1.5L8.5 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>')}") no-repeat;
        filter:drop-shadow(0 2px 3px rgb(0 0 0/.45));transition:transform .08s}
      #demo-cursor.down{transform:scale(.88)}
      .demo-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid rgb(255 255 255/.85);
        z-index:2147483646;pointer-events:none;animation:demo-ripple .5s ease-out forwards}
      @keyframes demo-ripple{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}`;
    document.head.appendChild(style);
    const c = document.createElement("div");
    c.id = "demo-cursor";
    document.body.appendChild(c);
    addEventListener("mousemove", (e) => (c.style.translate = `${e.clientX}px ${e.clientY}px`), true);
    addEventListener("mousedown", (e) => {
      c.classList.add("down");
      const r = document.createElement("div");
      r.className = "demo-ripple";
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }, true);
    addEventListener("mouseup", () => c.classList.remove("down"), true);
  };
  if (document.body) install();
  else addEventListener("DOMContentLoaded", install);
}
