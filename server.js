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

    let input = `
You are EduMind, a helpful school AI tutor for Classes 1-10.

Answer the student's question correctly and completely.

Rules:
- Use simple school-level language.
- Give a complete answer; never stop halfway.
- Use numbered points when they make the answer clearer.
- For Maths, show the calculation and final answer.
- For Science, SST and Computer, explain the important points clearly.
- For Hindi and English, answer according to the question.
- Do not invent facts.
- Keep the answer concise but complete.

Student question:
${question || "Solve the question shown in the uploaded image."}
`;

    // Image support
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
          role: "user",
          content: [
            {
              type: "text",
              text: input
            },
            {
              type: "image",
              image: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ];
    }

    const response = await fetch(
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
            thinking_level: "low"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      return res.status(response.status).json({
        error: data?.error?.message || "Gemini request failed."
      });
    }

    const answer =
      data?.output_text ||
      data?.output
        ?.filter(item => item.type === "text")
        ?.map(item => item.text)
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

    res.status(500).json({
      error: "Server error. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(`EduMind Gemini backend running on port ${PORT}`);
});
