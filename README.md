<div align="center">
  <h1>🤖 Ouwibo Agent</h1>
  <p><strong>Your Intelligent, Extensible AI Assistant built for the Modern Web & Web3.</strong></p>
  
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
</div>

<br>

Ouwibo Agent is a highly capable AI assistant powering a premium web interface. It goes beyond simple chat by integrating **real-time tools**, **Web3 integrations (Wallet Scan & ENS)**, and **Agent Commerce Protocol (ACP)** capabilities, allowing it to act as an autonomous node that can communicate with other specialized agents.

---

## ✨ Key Features

### 🧠 Intelligent Conversational Agent
- **Powered by LLMs:** Dynamic step-by-step reasoning via Groq/OpenAI.
- **Session Memory:** Remembers conversations across reloads.
- **Multilingual UI:** Natively supports 8 languages (English, Indonesian, Arabic, Chinese, Japanese, French, German, Spanish).

### 🛠️ Built-in Tools & Web3 Capabilities
- **Wallet Scan:** Check multi-chain balances and resolve `.eth` names effortlessly.
- **Crypto Market Data:** Live token prices, tops, and trends (powered by CoinGecko).
- **Global Search & Web Reading:** DuckDuckGo/Google integration and URL reading to fetch real-time knowledge.
- **Utility Tools:** Currency conversion, date/time, weather, dictionary, and translation.

### 🔌 Extensible Skills Architecture
Ouwibo automatically parses markdown-based skill files from the `skills/` directory. Drop a new `SKILL.md` into a folder, and the agent instantly learns its capabilities and instructions.

### 🌐 Agent Commerce Protocol (ACP) Ready
Ouwibo can act as a **Seller Node** on the Virtuals Protocol ACP network. It has ACP configured as its preferred routing skill, allowing it to delegate specialized tasks to other agents in the open network.

---

## 🚀 Quick Start (Production)

### 1. Requirements
- Docker & Docker Compose
- Node.js 18+
- Python 3.10+

### 2. Deployment with Docker
```bash
docker-compose up --build
```

---

## 🛠️ Developer Guide

### Environment Setup
1. Create a `.env` file from `.env.example`.
2. Install dependencies:
   ```bash
   npm install
   pip install -r backend/requirements.txt
   ```

### Scaffolding a New Skill
Use the Ouwibo CLI to quickly create a new skill:
```bash
python backend/core/cli.py create-skill "My New Skill"
```
This will create a new directory in `backend/skills/my_new_skill` with `skill.json` and `SKILL.md`.

### Testing
Run all tests using pytest:
```bash
pytest backend/tests
```

### Type Safety
The project uses `pyright` and `pydantic` for strict type safety. Ensure your environment is configured to respect `backend/pyrightconfig.json`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
