import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomUser {
  ws: WebSocket;
  userId: string;
  name: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  role?: string;
  lastSeen: number;
}

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
      console.warn('Transcription API Notice (using client web speech fallback):', err?.message || err);
      return res.json({
        success: false,
        rateLimited: err?.message?.includes('resource_exhausted') || err?.status === 429,
        transcription: '',
        fallback: 'Web speech fallback active.'
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
  // 5. Real Meeting Summarizer Route (gemini-3.8-flash)
  // Summarizes ACTUAL transcript / speech from the meeting into real structured summary
  // ========================================================
  app.post('/api/gemini/summarize-meeting', async (req, res) => {
    try {
      const { meetingTitle, transcript, durationMinutes } = req.body;

      if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
        return res.json({
          success: true,
          summary: {
            title: meetingTitle || 'Live Meeting',
            overview: 'No speech or conversation was recorded during this meeting session.',
            keyPoints: ['Meeting was opened and concluded without recorded audio.'],
            decisions: [],
            actionItems: []
          },
          modelUsed: 'none (empty transcript)'
        });
      }

      const prompt = `You are MidMeetMind AI, a strict, factual meeting analyst.
Analyze the following verbatim transcript from the meeting titled "${meetingTitle || 'Live Meeting'}".
Duration: ${durationMinutes || 1} minute(s).

STRICT ACCURACY RULES:
- ONLY summarize what is explicitly mentioned in the transcript below.
- DO NOT invent, assume, or hallucinate projects, dates, deliverables, or participants that are not in the text.
- If the speaker only spoke a few words or one topic, summarize only that specific topic accurately.
- If no decisions were made, leave decisions as an empty array [].
- If no tasks or action items were assigned, leave actionItems as an empty array [].

Meeting Transcript:
"""
${transcript.trim()}
"""

Extract structured JSON:
{
  "title": string (concise title reflecting the actual words spoken),
  "overview": string (2-3 honest sentences of what was actually said),
  "keyPoints": string[] (list of points actually discussed),
  "decisions": string[] (actual decisions made, or empty [] if none),
  "actionItems": [
    {
      "description": string (specific task mentioned),
      "assignedTo": string (person mentioned or "Participant"),
      "priority": "urgent" | "high" | "normal",
      "dueDate": string (mentioned date or "TBD")
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch (pErr) {
        console.warn('Could not parse Gemini JSON summary:', rawText);
        parsed = {
          title: meetingTitle || 'Live Meeting Summary',
          overview: rawText.slice(0, 300),
          keyPoints: ['Live discussion recorded.'],
          decisions: [],
          actionItems: []
        };
      }

      return res.json({
        success: true,
        summary: parsed,
        modelUsed: 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.warn('Meeting Summarizer API Notice (using factual transcript extractor fallback):', err?.message || err);

      // Intelligent factual fallback extracting directly from user's transcript lines
      const { meetingTitle, transcript } = req.body;
      const lines = typeof transcript === 'string'
        ? transcript.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
        : [];

      const cleanPoints = lines.map((l: string) => {
        // Strip [00:00] Speaker: prefix
        return l.replace(/^\[[^\]]*\]\s*[^:]*:\s*/i, '').trim();
      }).filter((l: string) => l.length > 0);

      const fallbackSummary = {
        title: meetingTitle || 'Live Meeting Summary',
        overview: cleanPoints.length > 0
          ? `Meeting discussion covered: ${cleanPoints.slice(0, 3).join('. ')}.`
          : 'Live conference concluded successfully.',
        keyPoints: cleanPoints.length > 0 ? cleanPoints.slice(0, 6) : ['Live meeting session conducted.'],
        decisions: cleanPoints.filter((p: string) => /agree|decid|confirm|approved|done/i.test(p)),
        actionItems: cleanPoints
          .filter((p: string) => /will|need to|must|task|todo|plan to/i.test(p))
          .map((desc: string) => ({
            description: desc,
            assignedTo: 'Participant',
            priority: 'normal',
            dueDate: 'TBD'
          }))
      };

      return res.json({
        success: true,
        summary: fallbackSummary,
        modelUsed: 'factual-transcript-extractor-fallback',
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

    // Fallback handler for all non-API GET routes (e.g. /meet/:id, /summary/:id)
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  // ========================================================
  // Real-Time WebSocket Server (Presence, WebRTC Signaling, Live Media)
  // ========================================================
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Map of meetingId -> Map of userId -> RoomUser
  const rooms = new Map<string, Map<string, RoomUser>>();

  // Helper to broadcast to a room
  const broadcastToRoom = (meetingId: string, message: any, excludeUserId?: string) => {
    const room = rooms.get(meetingId);
    if (!room) return;
    const payload = JSON.stringify(message);
    room.forEach((user, uId) => {
      if (uId !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
        try {
          user.ws.send(payload);
        } catch (e) {
          console.warn('WS send error:', e);
        }
      }
    });
  };

  // Helper to send to a specific user
  const sendToUser = (meetingId: string, targetUserId: string, message: any) => {
    const room = rooms.get(meetingId);
    if (!room) return;
    const target = room.get(targetUserId);
    if (target && target.ws.readyState === WebSocket.OPEN) {
      try {
        target.ws.send(JSON.stringify(message));
      } catch (e) {
        console.warn('WS sendToUser error:', e);
      }
    }
  };

  // HTTP Upgrade handler for /ws
  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (parsedUrl.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.warn('WS upgrade error:', err);
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    let currentMeetingId: string | null = null;
    let currentUserId: string | null = null;

    ws.on('message', (raw: any) => {
      try {
        const data = JSON.parse(raw.toString());
        const { type } = data;

        switch (type) {
          case 'join': {
            const { meetingId, userId, name, isCameraOn, isMicOn, role } = data;
            if (!meetingId || !userId) return;

            currentMeetingId = meetingId;
            currentUserId = userId;

            if (!rooms.has(meetingId)) {
              rooms.set(meetingId, new Map());
            }
            const room = rooms.get(meetingId)!;

            const userObj: RoomUser = {
              ws,
              userId,
              name: name || 'Participant',
              isCameraOn: !!isCameraOn,
              isMicOn: !!isMicOn,
              role: role || 'attendee',
              lastSeen: Date.now()
            };
            room.set(userId, userObj);

            // Send full room state to the newly joined user
            const participants = Array.from(room.values()).map(u => ({
              userId: u.userId,
              name: u.name,
              isCameraOn: u.isCameraOn,
              isMicOn: u.isMicOn,
              role: u.role
            }));

            ws.send(JSON.stringify({
              type: 'room-state',
              participants
            }));

            // Notify everyone else that this user joined
            broadcastToRoom(meetingId, {
              type: 'user-joined',
              participant: {
                userId,
                name: userObj.name,
                isCameraOn: userObj.isCameraOn,
                isMicOn: userObj.isMicOn,
                role: userObj.role
              }
            }, userId);

            break;
          }

          case 'video-frame': {
            const { meetingId, userId, frame } = data;
            if (!meetingId || !userId || !frame) return;
            const room = rooms.get(meetingId);
            if (room && room.has(userId)) {
              room.get(userId)!.isCameraOn = true;
            }
            // Broadcast live camera frame to all peers in the room
            broadcastToRoom(meetingId, {
              type: 'video-frame',
              userId,
              frame
            }, userId);
            break;
          }

          case 'clear-frame': {
            const { meetingId, userId } = data;
            if (!meetingId || !userId) return;
            const room = rooms.get(meetingId);
            if (room && room.has(userId)) {
              room.get(userId)!.isCameraOn = false;
            }
            broadcastToRoom(meetingId, {
              type: 'clear-frame',
              userId
            }, userId);
            break;
          }

          case 'media-status': {
            const { meetingId, userId, isCameraOn, isMicOn } = data;
            if (!meetingId || !userId) return;
            const room = rooms.get(meetingId);
            if (room && room.has(userId)) {
              const u = room.get(userId)!;
              u.isCameraOn = isCameraOn;
              u.isMicOn = isMicOn;
            }
            broadcastToRoom(meetingId, {
              type: 'media-status',
              userId,
              isCameraOn,
              isMicOn
            }, userId);
            break;
          }

          case 'audio-broadcast': {
            const { meetingId, userId, audio, mimeType } = data;
            if (!meetingId || !userId || !audio) return;
            broadcastToRoom(meetingId, {
              type: 'audio-broadcast',
              userId,
              audio,
              mimeType
            }, userId);
            break;
          }

          case 'caption': {
            const { meetingId, speaker, text } = data;
            if (!meetingId || !text) return;
            broadcastToRoom(meetingId, {
              type: 'caption',
              speaker,
              text,
              timestamp: Date.now()
            });
            break;
          }

          case 'chat': {
            const { meetingId, sender, text, time } = data;
            if (!meetingId || !text) return;
            broadcastToRoom(meetingId, {
              type: 'chat',
              sender,
              text,
              time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            break;
          }

          // Direct WebRTC signaling relays
          case 'webrtc-offer': {
            const { meetingId, toUserId, fromUserId, offer } = data;
            if (meetingId && toUserId) {
              sendToUser(meetingId, toUserId, {
                type: 'webrtc-offer',
                fromUserId,
                offer
              });
            }
            break;
          }

          case 'webrtc-answer': {
            const { meetingId, toUserId, fromUserId, answer } = data;
            if (meetingId && toUserId) {
              sendToUser(meetingId, toUserId, {
                type: 'webrtc-answer',
                fromUserId,
                answer
              });
            }
            break;
          }

          case 'webrtc-ice': {
            const { meetingId, toUserId, fromUserId, candidate } = data;
            if (meetingId && toUserId) {
              sendToUser(meetingId, toUserId, {
                type: 'webrtc-ice',
                fromUserId,
                candidate
              });
            }
            break;
          }

          case 'heartbeat': {
            if (currentMeetingId && currentUserId) {
              const room = rooms.get(currentMeetingId);
              if (room && room.has(currentUserId)) {
                room.get(currentUserId)!.lastSeen = Date.now();
              }
            }
            break;
          }

          case 'leave': {
            handleUserLeave();
            break;
          }
        }
      } catch (err) {
        console.warn('WS onmessage parse error:', err);
      }
    });

    const handleUserLeave = () => {
      if (currentMeetingId && currentUserId) {
        const room = rooms.get(currentMeetingId);
        if (room && room.has(currentUserId)) {
          room.delete(currentUserId);

          // Broadcast user-left immediately to all remaining peers
          broadcastToRoom(currentMeetingId, {
            type: 'user-left',
            userId: currentUserId
          });

          // Send updated room participant list
          const updatedParticipants = Array.from(room.values()).map(u => ({
            userId: u.userId,
            name: u.name,
            isCameraOn: u.isCameraOn,
            isMicOn: u.isMicOn,
            role: u.role
          }));
          broadcastToRoom(currentMeetingId, {
            type: 'room-state',
            participants: updatedParticipants
          });

          if (room.size === 0) {
            rooms.delete(currentMeetingId);
          }
        }
        currentMeetingId = null;
        currentUserId = null;
      }
    };

    ws.on('close', () => {
      handleUserLeave();
    });

    ws.on('error', () => {
      handleUserLeave();
    });
  });

  // Periodic cleanup of stale connections (> 30s without heartbeat)
  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, meetingId) => {
      room.forEach((user, userId) => {
        if (now - user.lastSeen > 30000) {
          try {
            user.ws.close();
          } catch {}
          room.delete(userId);
          broadcastToRoom(meetingId, {
            type: 'user-left',
            userId
          });
        }
      });
      if (room.size === 0) {
        rooms.delete(meetingId);
      }
    });
  }, 10000);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[MidMeetMind Server] HTTP & WebSocket running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
