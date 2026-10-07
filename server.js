const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

console.log(
  "OpenRouter key loaded:",
  !!OPENROUTER_API_KEY,
  "length:",
  OPENROUTER_API_KEY?.length || 0
);

const client = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

app.get("/", (req, res) => {
  res.send("EduMind OpenRouter AI backend is running!");
});

app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: "Question is required."
      });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is not configured."
      });
    }

    const response = await client.chat.completions.create({
      model: "openrouter/free",
      messages: [
        {
          role: "system",
          content: `
You are Rudra AI, a smart school tutor for Classes 1-10.

Answer correctly and directly.

Rules:
- Answer exactly what is asked.
- Use simple school-level language.
- For Maths, show steps and final answer.
- For Science, explain clearly.
- For Hindi and English, answer appropriately.
- For SST and Computer, use clear points when useful.
- Do not invent facts.
- Do not give irrelevant answers.
- Keep answers concise but complete.
`
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });

    const answer = response?.choices?.[0]?.message?.content;

    if (!answer || !answer.trim()) {
      return res.status(500).json({
        error: "AI returned an empty answer."
      });
    }

    res.json({
      answer: answer.trim()
    });

  } catch (error) {
    console.error("OpenRouter error:", error);

    res.status(500).json({
      error:
        error?.error?.message ||
        error?.message ||
        "OpenRouter AI error. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `EduMind OpenRouter backend running on port ${PORT}`
  );
});
