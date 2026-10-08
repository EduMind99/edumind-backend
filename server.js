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
    const { question, image } = req.body;

    if (!question && !image) {
      return res.status(400).json({
        error: "Question or image is required."
      });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is not configured."
      });
    }

    // Normal text question
    let userContent;

    if (image) {
      // Photo + question
      userContent = [
        {
          type: "text",
          text:
            question ||
            "Read the question in this photo carefully and solve it. Give a clear school-level answer."
        },
        {
          type: "image_url",
          image_url: {
            url: image
          }
        }
      ];
    } else {
      // Text only
      userContent = question;
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
- If an image is provided, carefully read the image before answering.
- Solve questions visible in the image.
- Do not guess text that is unclear.
- If the image is unclear, say that the photo is unclear.
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
          content: userContent
        }
      ],

      temperature: 0.2,
      max_tokens: 1200
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
