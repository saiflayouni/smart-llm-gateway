import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VALID_API_KEYS = (process.env.GATEWAY_API_KEYS || "demo-key-123").split(",");
const rateLimitMap = new Map();

function authMiddleware(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || !VALID_API_KEYS.includes(key)) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
}

function rateLimitMiddleware(req, res, next) {
  const key = req.headers["x-api-key"];
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
  const timestamps = rateLimitMap.get(key).filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return res.status(429).json({ error: "Rate limit exceeded. Max 10 requests/minute." });
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  next();
}

function selectModel(message) {
  const msg = message.toLowerCase();
  if (msg.includes("code") || msg.includes("debug") || msg.includes("function") || msg.includes("write a")) {
    return "groq";
  }
  return "gemini";
}

app.get("/", (req, res) => {
  res.json({ message: "Smart LLM Gateway", version: "3.0", endpoints: ["POST /chat", "GET /health"] });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/chat", authMiddleware, rateLimitMiddleware, async (req, res) => {
  const { message, model } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  const selected = model === "auto" || !model ? selectModel(message) : model;
  const startTime = Date.now();

  try {
    let response, provider;

    if (selected === "groq") {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: message }],
      });
      response = completion.choices[0].message.content;
      provider = "groq/llama-3.3-70b";
    } else {
      const result = await gemini.models.generateContent({
        model: "models/gemini-2.5-flash",
        contents: message,
      });
      response = result.text;
      provider = "google/gemini-2.5-flash";
    }

    const latencyMs = Date.now() - startTime;
    const log = { timestamp: new Date().toISOString(), provider, latencyMs, messageLength: message.length, model: selected };
    console.log(JSON.stringify(log));

    res.json({ success: true, provider, latencyMs, response });

  } catch (error) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), error: error.message }));
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Smart Gateway v3.0 started on port ${PORT}`);
});
