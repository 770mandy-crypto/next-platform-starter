import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// המפתחות נבדקים בזמן ריצה ולא בזמן טעינת המודול, כדי שהאתר יעלה גם בלי הגדרות.
function isRealKey(key) {
  return Boolean(key && key.startsWith("sk-") && !key.includes("YOUR_"));
}

export function hasClaude() {
  return isRealKey(process.env.ANTHROPIC_API_KEY);
}

export function hasOpenAI() {
  return isRealKey(process.env.OPENAI_API_KEY);
}

export function anthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function openaiClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
