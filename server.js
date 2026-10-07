const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "12mb" }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const sleep = ms => new Promise(r => setTimeout(r, ms));

app.get("/", (req, res) => {
  res.send("EduMind Gemini backend is running!");
});

app.post("/api/ask", async (req, res) => {
  try {
    const { question, image } = req.body;

    if (!question && !image) {
      return res.status(400).json({
        error: "Question or image is required."
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    let prompt = `
You are EduMind, a fast school AI tutor for Classes 1-10.

Answer the student's question correctly and completely.

Rules:
- Be fast and concise.
- Never stop halfway.
- Use simple school-level language.
- For Maths, show calculation and final answer.
- For Science, SST and Computer, use clear numbered points when useful.
- For Hindi and English, answer exactly what is asked.
- If an image is provided, read and solve the question.
- Do not invent facts.

Question:
${question || "Solve the question in the uploaded image."}
`;

    let input = prompt;

    if (image) {
      let base64Data = image;
      let mimeType = "image/jpeg";

      if (image.startsWith("data:")) {
        const match = image.match(/^data:(.+?);base64,(.+)$/);

        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      input = [
        {
          type: "text",
          text: prompt
        },
        {
          type: "image",
          image: {
            mime_type: mimeType,
            data: base64Data
          }
        }
      ];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;

    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
          },
          body: JSON.stringify({
            model: "gemini-3.8-flash",
            input: input,
            store: false,
            generation_config: {
              temperature: 0.2,
              max_output_tokens: 700
            }
          }),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini is temporarily unavailable. Please try again."
      });
    }

    const answer =
      data?.output_text ||
      data?.output
        ?.filter(x => x.type === "text")
        ?.map(x => x.text)
        ?.join("") ||
      "";

    if (!answer.trim()) {
      return res.status(500).json({
        error: "Gemini returned an empty answer."
      });
    }

    res.json({
      answer: answer.trim()
    });

  } catch (error) {
    console.error("Server error:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "AI took too long. Please try again."
      });
    }

    res.status(500).json({
      error: "AI server error. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(`EduMind Gemini backend running on port ${PORT}`);
});
