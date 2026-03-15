# Ouwibo Agent

AI Agent fullstack berbasis Python (FastAPI) + Groq LLM (LLaMA), dilengkapi antarmuka web, global search, dan dukungan 8 bahasa.

---

## Fitur

- 💬 **Chat Agent** — tanya apa saja, agent merencanakan & mengeksekusi langkah secara otomatis
- 🔍 **Global Search** — halaman pencarian ala Google menggunakan DuckDuckGo
- 🌐 **8 Bahasa** — Indonesia, English, العربية (RTL), 中文, 日本語, Français, Deutsch, Español
- 🧮 **Kalkulator Aman** — evaluasi ekspresi matematika tanpa `eval()`
- 🗄️ **Riwayat Sesi** — percakapan tersimpan di SQLite, persisten antar reload
- 🔒 **Production-Ready** — rate limiting, security headers, CORS, input validation

---

## Struktur Proyek

```
ouwibo-agent/
├── api.py               # FastAPI server — semua endpoint REST
├── main.py              # CLI entry point (--task / --interactive)
├── database.py          # Koneksi SQLite (SQLAlchemy 2.0)
├── models.py            # Model database: ChatMessage
├── requirements.txt     # Dependensi Python
├── .env.example         # Contoh konfigurasi environment
│
├── ouwibo_agent/        # Python package — logika agent
│   ├── config.py        # Konstanta global
│   ├── agent.py         # Loop eksekusi agent
│   ├── planner.py       # LLM planner (Groq + LLaMA)
│   ├── memory.py        # Riwayat percakapan in-memory
│   └── tools.py         # Tools: Calculator & WebSearch
│
└── static/              # Frontend (vanilla HTML/CSS/JS)
    ├── index.html       # Halaman chat
    ├── script.js        # Logika chat
    ├── search.html      # Halaman pencarian global
    ├── search.js        # Logika pencarian
    ├── i18n.js          # Sistem multi-bahasa
    └── style.css        # Gaya tambahan
```

---

## Cara Menjalankan

### 1. Clone & masuk ke direktori

```bash
git clone <repo-url>
cd ouwibo-agent
```

### 2. Buat virtual environment

```bash
python -m venv venv
source venv/bin/activate        # macOS/Linux
# atau
venv\Scripts\activate           # Windows
```

### 3. Install dependensi

```bash
pip install -r requirements.txt
```

### 4. Konfigurasi environment

```bash
cp .env.example .env
```

Buka `.env` lalu isi API key:

```
GROQ_API_KEY=your_groq_api_key_here
```

> Dapatkan API key gratis di: https://console.groq.com/keys

### 5. Jalankan server

```bash
uvicorn api:app --reload
```

Buka browser: **http://localhost:8000**

---

## Halaman

| URL | Keterangan |
|-----|------------|
| `http://localhost:8000` | Halaman chat dengan agent |
| `http://localhost:8000/search.html` | Global search ala Google |
| `http://localhost:8000/docs` | Dokumentasi API (Swagger UI) |
| `http://localhost:8000/redoc` | Dokumentasi API (ReDoc) |

---

## API Endpoints

| Method | Path | Keterangan |
|--------|------|------------|
| `GET` | `/health` | Health check |
| `POST` | `/chat` | Kirim pesan ke agent |
| `GET` | `/search?q=...` | Pencarian web |
| `GET` | `/sessions` | Daftar semua sesi |
| `GET` | `/sessions/{id}/history` | Riwayat satu sesi |
| `DELETE` | `/sessions/{id}` | Hapus satu sesi |

### Contoh request `/chat`

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Siapa presiden Indonesia?", "session_id": "sesi-1"}'
```

### Contoh request `/search`

```bash
curl "http://localhost:8000/search?q=python+programming&max_results=5"
```

---

## Mode CLI

Jalankan agent langsung dari terminal tanpa server web:

```bash
# Single task
python main.py --task "Berapa 15% dari 200?"

# Mode interaktif
python main.py --interactive

# Mode interaktif + log debug
python main.py --interactive --verbose
```

Perintah khusus di mode interaktif:
- `clear` — reset memori sesi
- `exit` / `quit` — keluar

---

## Konfigurasi Lanjutan

Tambahkan ke file `.env`:

```env
# API key Groq (wajib)
GROQ_API_KEY=your_groq_api_key_here

# CORS — pisahkan dengan koma untuk production
# Default: * (izinkan semua, hanya untuk development)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Rate Limiting (default)

| Endpoint | Batas |
|----------|-------|
| `POST /chat` | 15 request/menit per IP |
| `GET /search` | 30 request/menit per IP |
| `GET /sessions` | 60 request/menit per IP |
| Semua endpoint | 200 request/menit per IP |

---

## Menjalankan untuk Production

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --workers 2
```

> **Catatan:** Untuk production sungguhan, gunakan reverse proxy seperti Nginx di depan uvicorn dan set `ALLOWED_ORIGINS` ke domain spesifik kamu.

---

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| LLM | Groq API (LLaMA 3.3 70B / 3.1 8B) |
| Database | SQLite via SQLAlchemy 2.0 |
| Search | DDGS (DuckDuckGo) |
| Rate Limiting | SlowAPI |
| Frontend | HTML, Tailwind CSS, Vanilla JS |
| Markdown | marked.js + DOMPurify |
| i18n | Custom (8 bahasa) |

---

## Lisensi

MIT License — lihat file `LICENSE` untuk detail.