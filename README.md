# GURU SMART Secure AI

Versi ini memindahkan API Key AI dari browser ke backend Node.js.

## 1. Persiapan
- Install Node.js 18+.
- Salin `.env.example` menjadi `.env`.
- Isi `GEMINI_API_KEY` dan `GEMINI_MODEL`, atau pilih `AI_PROVIDER=openai` dan isi konfigurasi OpenAI.

## 2. Jalankan
```bash
npm install
npm start
```
Buka `http://localhost:3000`.

## 3. Keamanan
- API Key hanya dibaca oleh `server.js` melalui environment/.env.
- Frontend hanya memanggil `/api/ai/chat`.
- Ada rate limit pada endpoint AI.
- Helmet aktif untuk security headers.
- API Key tidak pernah dikirim ke JavaScript frontend.
- Jangan upload `.env` ke GitHub.

## 4. Produksi
Gunakan HTTPS, simpan secret di environment variable hosting, aktifkan autentikasi server-side, dan gunakan database/server session bila aplikasi akan dipakai banyak guru.
