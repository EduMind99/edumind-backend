const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

const API_KEY = "0000000000";
const BASE_URL = "https://aihorde.net/api/v2";

app.use(cors());
app.use(express.json());

app.post("/api/ask", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({
        error: "Question is required."
      });
    }

    const submitResponse = await fetch(
      `${BASE_URL}/generate/text/async`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "apikey": API_KEY
        },
        body: JSON.stringify({
     prompt:
  "Answer ONLY the exact question. " +
  "Give a very short school-level answer. " +
  "Maximum 1-2 sentences. " +
  "Do not explain unnecessarily. " +
  "Do not add examples unless asked. " +
  "Do not guess or invent facts. " +
  "For Maths, give only calculation and final answer. " +
  "Question: " + question,

          models: [
            "koboldcpp/Llama-3.2-3B-Instruct"
          ],

          params: {
            max_length: 80,
            temperature: 0.1,
            singleline: true,
            frmttriminc: true
          }
        })
      }
    );

    const submitText = await submitResponse.text();

    let submitData;

    try {
      submitData = JSON.parse(submitText);
    } catch {
      return res.status(500).json({
        error: "AI Horde returned an invalid response.",
        details: submitText
      });
    }

    if (!submitResponse.ok) {
      return res.status(submitResponse.status).json({
        error: "AI Horde request failed.",
        details: submitData
      });
    }

    const requestId = submitData.id;

    if (!requestId) {
      return res.status(500).json({
        error: "No request ID received from AI Horde.",
        details: submitData
      });
    }

    for (let i = 0; i < 60; i++) {
     await new Promise(resolve => setTimeout(resolve, 500));

      const statusResponse = await fetch(
        `${BASE_URL}/generate/text/status/${requestId}`,
        {
          headers: {
            "Accept": "application/json",
            "apikey": API_KEY
          }
        }
      );

      const statusText = await statusResponse.text();

      let statusData;

      try {
        statusData = JSON.parse(statusText);
      } catch {
        return res.status(500).json({
          error: "Invalid status response from AI Horde.",
          details: statusText
        });
      }

      if (statusData.faulted) {
        return res.status(500).json({
          error: "AI Horde generation failed.",
          details: statusData
        });
      }

      if (statusData.done) {
        const answer = statusData.generations?.[0]?.text;

        if (!answer) {
          return res.status(500).json({
            error: "AI returned no answer.",
            details: statusData
          });
        }

        return res.json({
          answer: answer.trim()
        });
      }
    }

    return res.status(504).json({
      error: "AI request timed out. Try again."
    });

  } catch (error) {
    console.error("AI ERROR:", error);

    return res.status(500).json({
      error: "Server error.",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `EduMind backend running at http://localhost:${PORT}`
  );
});