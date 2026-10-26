import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// FOX RUNNER 3D LEADERBOARD STORAGE & API
// ==========================================
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  level: number;
  updatedAt: number;
}

const LEADERBOARD_FILE = path.resolve(__dirname, 'leaderboard.json');

function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (e) {}
}

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any legacy dummy/seed entries so only real players remain
        const realPlayers = parsed.filter(
          (item: LeaderboardEntry) => item && typeof item.playerId === 'string' && !item.playerId.startsWith('seed-')
        );
        if (realPlayers.length !== parsed.length) {
          saveLeaderboard(realPlayers);
        }
        return realPlayers;
      }
    }
  } catch (e) {}
  return [];
}

let leaderboardCache: LeaderboardEntry[] = loadLeaderboard();

app.get('/api/leaderboard', (_req, res) => {
  const sorted = [...leaderboardCache]
    .sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt)
    .slice(0, 30);
  res.json({ entries: sorted });
});

app.post('/api/leaderboard', (req, res) => {
  try {
    const { playerId, playerName, score, level } = req.body || {};
    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Invalid playerId' });
    }

    const cleanId = playerId.trim().slice(0, 48);
    const rawName = typeof playerName === 'string' && playerName.trim() ? playerName.trim().slice(0, 32) : `FoxRunner(${cleanId.slice(0, 4).toUpperCase()})`;
    const numericScore = Math.max(0, Math.floor(Number(score) || 0));
    const numericLevel = Math.max(1, Math.floor(Number(level) || 1));

    const existingIdx = leaderboardCache.findIndex((item) => item.playerId === cleanId);
    if (existingIdx >= 0) {
      const existing = leaderboardCache[existingIdx];
      existing.playerName = rawName;
      if (numericScore >= existing.score) {
        existing.score = numericScore;
        existing.level = Math.max(existing.level, numericLevel);
        existing.updatedAt = Date.now();
      }
    } else if (!cleanId.startsWith('seed-')) {
      leaderboardCache.push({
        playerId: cleanId,
        playerName: rawName,
        score: numericScore,
        level: numericLevel,
        updatedAt: Date.now()
      });
    }

    leaderboardCache.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
    if (leaderboardCache.length > 100) {
      leaderboardCache = leaderboardCache.slice(0, 100);
    }
    saveLeaderboard(leaderboardCache);

    return res.json({
      entries: leaderboardCache.slice(0, 30)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Gemini Chat API Proxy
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'GEMINI_API_KEY belum dikonfigurasi di server.' } });
  }

  try {
    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: { message: err?.message || 'Server error' } });
  }
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
