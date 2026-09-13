import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const model = provider === 'openai' ? process.env.OPENAI_MODEL : process.env.GEMINI_MODEL;

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' } });

function configured() {
  return provider === 'gemini' ? Boolean(process.env.GEMINI_API_KEY) : Boolean(process.env.OPENAI_API_KEY);
}

app.get('/api/ai/status', (_req, res) => {
  res.json({ configured: configured(), provider, model: model || null });
});

function buildPrompt(message, context, history) {
  const compactContext = JSON.stringify(context || {}).slice(0, 50000);
  const compactHistory = JSON.stringify(Array.isArray(history) ? history.slice(-10) : []).slice(0, 12000);
  return `Anda adalah Asisten AI Guru profesional untuk aplikasi GURU SMART. Jawab dalam Bahasa Indonesia. Utamakan jawaban praktis, terstruktur, dan siap dipakai guru. Jangan mengarang data siswa; bila data tidak tersedia, katakan tidak tersedia. Data aplikasi berikut adalah konteks internal dan harus diperlakukan sebagai data sekolah yang privat.\n\nKONTEKS APLIKASI:\n${compactContext}\n\nRIWAYAT CHAT:\n${compactHistory}\n\nPERMINTAAN GURU:\n${message}`;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-3.8-flash')}:generateContent`;
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY}, body:JSON.stringify({ contents:[{role:'user',parts:[{text:prompt}]}], generationConfig:{temperature:0.4,maxOutputTokens:2500} }) });
  const data = await r.json();
  if(!r.ok) throw new Error(data?.error?.message || 'Gemini API error');
  return (data.candidates || []).flatMap(c => c.content?.parts || []).map(p => p.text || '').join('').trim() || 'AI tidak menghasilkan jawaban.';
}

async function callOpenAI(prompt) {
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/,'');
  const r = await fetch(`${base}/chat/completions`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`}, body:JSON.stringify({model:process.env.OPENAI_MODEL,messages:[{role:'system',content:'Anda adalah Asisten AI Guru profesional untuk GURU SMART. Jawab dalam Bahasa Indonesia.'},{role:'user',content:prompt}],temperature:0.4,max_tokens:2500}) });
  const data=await r.json(); if(!r.ok) throw new Error(data?.error?.message || 'OpenAI API error');
  return data?.choices?.[0]?.message?.content?.trim() || 'AI tidak menghasilkan jawaban.';
}

app.post('/api/ai/chat', aiLimiter, async (req,res) => {
  try {
    if(!configured()) return res.status(503).json({error:'AI belum dikonfigurasi di server. Isi API Key pada file .env.'});
    const message=String(req.body?.message || '').trim();
    if(!message) return res.status(400).json({error:'Pesan kosong.'});
    if(message.length>8000) return res.status(400).json({error:'Pesan terlalu panjang.'});
    const prompt=buildPrompt(message,req.body?.context,req.body?.history);
    const text=provider==='openai' ? await callOpenAI(prompt) : await callGemini(prompt);
    res.json({text,provider,model});
  } catch(err) { console.error(err); res.status(502).json({error:err.message || 'Gagal menghubungi AI'}); }
});

app.get('*', (_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`GURU SMART Secure AI berjalan di http://localhost:${PORT}`));
