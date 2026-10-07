const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

    const parts = [];

    parts.push({
      text: `
You are EduMind, a fast and accurate school AI tutor for Classes 1-10.

Answer the student's question completely and correctly.

Rules:
- Use simple school-level language.
- Do not cut the answer in the middle.
- For explanations, use short numbered points when useful.
- For Maths, show the calculation and final answer.
- For Science/SST/Computer, give the important points clearly.
- For Hindi/English, answer according to the question.
- If an image is provided, read the question from the image and solve it.
- Do not invent facts.
- Keep the answer concise but complete.

Student question:
${question || "Solve the question shown in the uploaded image."}
`
    });

    // Optional image support
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

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(GEMINI_API_KEY),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini request failed."
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      return res.status(500).json({
        error: "Gemini returned an empty answer."
      });
    }

    res.json({
      answer: answer
    });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: "Server error. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(`EduMind Gemini backend running on port ${PORT}`);
});
