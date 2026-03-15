# Ouwibo Agent

Your intelligent AI assistant — search the web, answer questions, and solve problems instantly.

---

## What it does

- **AI Chat** — Ask anything. Ouwibo thinks step by step and gives you accurate answers.
- **Global Search** — A clean, fast search experience to find anything on the web.
- **Multilingual** — Supports 8 languages: Indonesian, English, Arabic, Chinese, Japanese, French, German, and Spanish.
- **Session Memory** — Conversations are remembered across page reloads.

---

## Getting Started

### 1. Install dependencies

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in your API key:

```
API_KEY=your_api_key_here
```

### 3. Run

```bash
uvicorn api:app --reload
```

Open your browser at **http://localhost:8000**

---

## Pages

| URL | Description |
|-----|-------------|
| `/` | AI Chat |
| `/search.html` | Global Search |
| `/docs` | API Reference |

---

## License

MIT