// server.js
// This is the ONLY file that ever touches your API key.
// Your webpage (index.html) talks to THIS server, and this server talks to Google.

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serves index.html

// Render will give you this as an "environment variable" - it is NOT written
// anywhere in this file, so it's safe to upload this code publicly.
const API_KEY = process.env.GEMINI_API_KEY;

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({
        error: true,
        code: "BAD_REQUEST",
        message: "No message provided.",
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: userMessage }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      const apiError = data && data.error;
      const isRateLimited =
        response.status === 429 || apiError?.status === "RESOURCE_EXHAUSTED";

      if (isRateLimited) {
        return res.status(429).json({
          error: true,
          code: "RATE_LIMIT",
          message: "You're sending messages too fast — wait a moment and try again.",
        });
      }

      return res.status(response.status || 500).json({
        error: true,
        code: "API_ERROR",
        message: apiError?.message || "The AI service returned an error.",
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I didn't get a response back.";

    res.json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: true,
      code: "SERVER_ERROR",
      message: "Something went wrong on the server.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
