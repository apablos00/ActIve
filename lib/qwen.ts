import OpenAI from "openai";

// Server-only. Qwen via Model Studio's OpenAI-compatible endpoint.
// Created on first use so a missing key fails the request, not the build.
let client: OpenAI | null = null;

export function getQwen() {
  if (!process.env.QWEN_API_KEY) throw new Error("QWEN_API_KEY is not set");
  client ??= new OpenAI({
    apiKey: process.env.QWEN_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
  });
  return client;
}

export const QWEN_MODEL = process.env.QWEN_MODEL ?? "";
