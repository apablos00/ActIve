import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { parseExpression } from "@/lib/graph";
import { getQwen, QWEN_MODEL } from "@/lib/qwen";
import type { ConceptMap } from "@/lib/types";

export const maxDuration = 60;

const MAX_PAGES = 60;
const MAX_CHARS = 120_000;

const ConceptSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  explanation: z.string().min(1),
  pages: z.array(z.number().int()).min(1),
  misconception: z.string().min(1),
  bridge: z.string().min(1),
  graph: z
    .object({
      title: z.string().optional(),
      expression: z.string().min(1),
      xMin: z.number(),
      xMax: z.number(),
      xLabel: z.string().optional(),
      yLabel: z.string().optional(),
      markX: z.number().optional(),
      skier: z.boolean().optional(),
    })
    .nullish(),
});

const ConceptMapSchema = z.object({
  title: z.string().min(1),
  mainIdeas: z.array(z.string().min(1)).length(3),
  concepts: z.array(ConceptSchema).min(5).max(8),
});

const SYSTEM = `You are a learning designer. Return JSON matching the ConceptMap schema. Nothing else.
Use only the material. Cite page numbers for every concept.
3 main ideas, max 20 words each. 5-8 concepts, simplest first.
Each explanation is max 60 words, from the source only.
Each misconception is a real trap a student would fall into.
Each bridge is an accurate analogy from the student's academic interests, hobbies or programme. Vary the source across concepts. Max 30 words.
Optional graph: for concepts a curve makes visible (functions, slopes, rates, growth, cost, profit), add a graph the board can draw. expression is y in x using + - * / ^ ( ) sqrt exp ln sin cos pi. Ground it in the bridge when you can, e.g. a ski slope's height over distance with skier true. markX draws a tangent. Leave it out when a graph would not help.

Schema:
{
  "title": string,
  "mainIdeas": [string, string, string],
  "concepts": [
    { "id": "c1", "name": string, "explanation": string, "pages": number[], "misconception": string, "bridge": string,
      "graph"?: { "title": string, "expression": string, "xMin": number, "xMax": number, "xLabel"?: string, "yLabel"?: string, "markX"?: number, "skier"?: boolean } }
  ]
}`;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const profile = form.get("profile");
  if (!(file instanceof File) || typeof profile !== "string") {
    return Response.json({ error: "Send a PDF and a profile." }, { status: 400 });
  }

  let material: string;
  let totalPages: number;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: false });
    totalPages = Math.min(text.length, MAX_PAGES);
    material = text
      .slice(0, MAX_PAGES)
      .map((t, i) => `[p.${i + 1}]\n${t.trim()}`)
      .join("\n\n")
      .slice(0, MAX_CHARS);
  } catch {
    return Response.json({ error: "Could not read that PDF." }, { status: 422 });
  }
  if (material.replace(/\[p\.\d+\]/g, "").trim().length < 200) {
    return Response.json({ error: "This PDF has almost no text. Is it a scan?" }, { status: 422 });
  }

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Student: ${profile}\n\nMaterial:\n${material}` },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    let raw = "";
    try {
      const body = {
        model: QWEN_MODEL,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" as const },
        // JSON mode only works with thinking off on Qwen Plus models.
        enable_thinking: false,
      };
      const res = await getQwen().chat.completions.create(body);
      raw = res.choices[0]?.message?.content ?? "";
    } catch (e) {
      console.error("Qwen request failed", e);
      return Response.json({ error: "Qwen is unreachable. Try the Canvas import." }, { status: 502 });
    }

    let error: string;
    try {
      const parsed = ConceptMapSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        const map: ConceptMap = {
          id: crypto.randomUUID(),
          title: parsed.data.title,
          mainIdeas: parsed.data.mainIdeas,
          concepts: parsed.data.concepts.map(({ graph, ...c }, i) => ({
            ...c,
            // Drop graphs the board can't draw.
            ...(graph && graph.xMax > graph.xMin && parseExpression(graph.expression) && { graph }),
            id: `c${i + 1}`,
            pages: c.pages.filter((p) => p >= 1 && p <= totalPages),
          })),
        };
        return Response.json(map);
      }
      error = z.prettifyError(parsed.error);
    } catch {
      error = "Response was not valid JSON.";
    }

    messages.push(
      { role: "assistant", content: raw },
      { role: "user", content: `That JSON failed validation:\n${error}\nReturn the corrected JSON only.` },
    );
  }

  return Response.json({ error: "Qwen returned an invalid concept map. Try again." }, { status: 502 });
}
