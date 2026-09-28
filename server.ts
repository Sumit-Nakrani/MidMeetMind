import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware for parsing JSON (up to 50mb for base64 audio and video payload)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Google GenAI client (uses GEMINI_API_KEY from env)
  const ai = new GoogleGenAI();

  // ========================================================
  // 1. Audio Transcription Route (Model: gemini-3.5-transcribe)
  // ========================================================
  app.post('/api/gemini/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, meetingContext } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 is required' });
      }

      const prompt = meetingContext
        ? `You are an expert AI meeting transcriptionist. Transcribe this audio recording accurately.
Meeting Context: ${meetingContext}.
Format your response cleanly with clear punctuation, sentence breaks, and speaker/timestamp markers where applicable.`
        : 'Transcribe this audio recording verbatim with accurate punctuation and sentence flow.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType || 'audio/webm',
            },
          },
          {
            text: prompt,
          },
        ],
      });

      const transcriptionText = response.text || '';
      return res.json({
        success: true,
        transcription: transcriptionText,
        modelUsed: 'gemini-3.5-transcribe',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Transcription API Error:', err);
      return res.status(500).json({
        error: err?.message || 'Failed to transcribe audio',
        fallback: 'Could not connect to transcribe model. Please check microphone input and try again.'
      });
    }
  });

  // ========================================================
  // 2. Gemini Multi-Turn Chat Route (gemini-3.5-flash / gemini-3.1-pro-preview)
  // ========================================================
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { messages, systemInstruction, model = 'gemini-3.5-flash' } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array is required' });
      }

      // Convert messages to Gemini format
      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || m.text || '' }],
      }));

      const response = await ai.models.generateContent({
        model: model || 'gemini-3.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction || 'You are MidMeetMind AI, an intelligent meeting assistant and corporate workspace companion. You help users organize agendas, answer questions about meetings, extract action items, and clarify discussion points.',
        },
      });

      return res.json({
        success: true,
        reply: response.text || '',
        modelUsed: model,
      });
    } catch (err: any) {
      console.error('Chat API Error:', err);
      return res.status(500).json({
        error: err?.message || 'Failed to generate chat response',
      });
    }
  });

  // ========================================================
  // 3. Google Search Grounding Route (gemini-3.5-flash + googleSearch)
  // ========================================================
  app.post('/api/gemini/search-grounding', async (req, res) => {
    try {
      const { query, meetingTopic } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'query is required' });
      }

      const prompt = meetingTopic
        ? `Meeting Topic: "${meetingTopic}"\nResearch question: ${query}\nProvide verified, up-to-date information grounded in Google Search.`
        : query;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      // Extract search grounding metadata if present
      const candidate = response.candidates?.[0];
      const searchChunks = candidate?.groundingMetadata?.groundingChunks || [];
      const webSources = searchChunks
        .map((chunk: any) => chunk.web?.uri ? { uri: chunk.web.uri, title: chunk.web.title } : null)
        .filter(Boolean);

      return res.json({
        success: true,
        answer: response.text || '',
        sources: webSources,
        modelUsed: 'gemini-3.5-flash (with googleSearch)',
      });
    } catch (err: any) {
      console.error('Search Grounding API Error:', err);
      return res.status(500).json({
        error: err?.message || 'Failed to execute grounded search',
      });
    }
  });

  // ========================================================
  // 4. Veo Video Generation Route (veo-3.1-fast-generate-preview)
  // ========================================================
  app.post('/api/gemini/generate-video', async (req, res) => {
    try {
      const { prompt, aspectRatio = '16:9' } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'prompt is required' });
      }

      // Valid aspect ratio constraints: 16:9 (landscape) or 9:16 (portrait)
      const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          aspectRatio: validAspect,
        },
      });

      return res.json({
        success: true,
        operationName: operation.name,
        modelUsed: 'veo-3.1-fast-generate-preview',
        aspectRatio: validAspect,
      });
    } catch (err: any) {
      console.error('Veo Video Gen Error:', err);
      return res.status(500).json({
        error: err?.message || 'Failed to initiate video generation',
      });
    }
  });

  // ========================================================
  // Vite Middleware / Static Serving
  // ========================================================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MidMeetMind Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
