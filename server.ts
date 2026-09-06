import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Body parser to handle JSON requests
  app.use(express.json());

  // Gemini API Route
  app.post("/api/generate-ideas", async (req, res) => {
    try {
      const { topic } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: "Lütfen bir sektör veya konu belirtin." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API anahtarı yapılandırılmamış." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Kullanıcı şu alanda veya konuda yenilikçi fikirler arıyor: "${topic}"

Lütfen güncel araştırma (Google Search) yaparak SADECE şunları ver:
1. **Fikirler:** Bu konuyla ilgili 2-3 adet basit, net ve pratik iş/ürün fikri (her biri en fazla 2 cümle).
2. **Örnek Videolar:** Bu fikirlere ilham verebilecek, internette halihazırda var olan konuyla ilgili 2-3 adet gerçek örnek video linki (YouTube, TikTok vb. platformlardan tam URL).

Lütfen karmaşık analizler, rakip detayları veya uzun uzun yazılar YAZMA. Çok sade, doğrudan ve sadece Markdown formatında liste şeklinde yanıt ver.`;

      let responseText = "";
      let retries = 3;
      let delay = 1000;

      while (retries > 0) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
            tools: [{ googleSearch: {} }],
          });
          responseText = response.text;
          break; // Success, exit retry loop
        } catch (err: any) {
          retries--;
          if (retries === 0) {
            throw err;
          }
          console.warn(`Gemini API error, retrying in ${delay}ms...`, err.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }

      res.json({ result: responseText });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      const errorMessage = error?.status === "UNAVAILABLE" || error?.message?.includes("high demand")
        ? "Yapay zeka servisi şu anda yoğun. Lütfen birkaç saniye sonra tekrar deneyin."
        : error.message || "Fikir üretilirken bir hata oluştu.";
        
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Static serving for production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
