const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

    const systemPrompt = `
You are Rudra AI, a smart school tutor for Classes 1-10.

Answer the student's question correctly.

Rules:
- Answer exactly what is asked.
- Use simple language.
- For Maths, show steps and final answer.
- For Science, explain clearly.
- For Hindi and English, answer appropriately.
- For SST and Computer, use clear points when useful.
- Do not make up facts.
- Do not give irrelevant answers.
- Keep answers reasonably concise but complete.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://rudra-g99.github.io/edumind/",
          "X-Title": "EduMind - Rudra AI"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: question
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter AI is temporarily unavailable."
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (!answer || !answer.trim()) {
      return res.status(500).json({
        error: "AI returned an empty answer."
      });
    }

    res.json({
      answer: answer.trim()
    });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: "AI server error. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `EduMind OpenRouter backend running on port ${PORT}`
  );
});
