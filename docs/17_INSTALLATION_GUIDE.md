# Installation & Setup Guide
## Project: LearnLens AI

---

## 1. Prerequisites
Before running LearnLens AI, verify your workstation meets the following minimum prerequisites:
1. **Python 3.10 or higher**:
   Check with `python --version`
2. **Node.js v18.0 or higher & npm**:
   Check with `node --version` and `npm --version`
3. **Google Chrome / Chromium**:
   Required for browser tab capture and extension support.

---

## 2. One-Command Master Startup
The easiest way to start LearnLens AI:
```bash
python run.py
```
Or double-click `start_learnlens.bat` on Windows!

This master launcher automatically:
1. Verifies local packages.
2. Initializes the SQLite database schema (`data/learnlens.db`).
3. Seeds the high-yield educational demo session for instant testing.
4. Starts the local FastAPI backend on `http://127.0.0.1:8000`.
5. Starts the Vite frontend on `http://localhost:5173`.
6. Automatically opens your default web browser to the application studio!

---

## 3. Optional Local Ollama Setup (For Advanced Local Models)
LearnLens AI works completely out-of-the-box using its built-in educational heuristic reasoning engine. If you want to use local open-weight language models via Ollama:
1. Download Ollama from [ollama.com](https://ollama.com).
2. Start Ollama:
   ```bash
   ollama serve
   ```
3. Pull recommended educational models:
   ```bash
   ollama pull qwen2.5:latest
   ollama pull qwen2.5-vl:latest
   ```
4. LearnLens AI will automatically detect Ollama at `http://localhost:11434` and switch the green indicator to "Connected"!

---

## 4. Loading the Chrome Extension (Optional Companion)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **"Developer mode"** via the toggle in the top-right corner.
3. Click **"Load unpacked"**.
4. Select the `extension/` directory inside this repository.
5. Click the puzzle icon in Chrome to pin **LearnLens AI Companion**.
6. You can now use the Chrome Side Panel directly while browsing educational courses!
