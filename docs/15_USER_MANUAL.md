# User Manual & Learning Guide
## Project: LearnLens AI
### Tagline: *"Show your AI what you are learning."*

---

## 1. Quick Start Guide
Welcome to **LearnLens AI**, your local-first personal learning environment and multimodal AI teacher.

### Step 1: Launch the Application
Run the one-click launcher in your terminal:
```bash
python run.py
```
This automatically starts the local backend, the frontend UI, and opens `http://localhost:5173` in your browser.

### Step 2: Start a Learning Session
1. In the left sidebar, click the green **"Start Learning"** button.
2. Enter your course or module title (e.g., *"Fortinet NSE 2 - Module 2: Network Firewalls"*).
3. Select your educational source type (YouTube, Coursera, Fortinet, Forage, Udemy, etc.).
4. Click **"Authorize & Start"**.
5. Chrome will display its native screen sharing picker:
   - Select the **Chrome Tab** where your course video is playing.
   - Make sure the **"Share tab audio"** checkbox is checked so the AI can transcribe the instructor's voice!
   - Click **"Share"**.

---

## 2. Navigating the Workspace

### 2.1 AI Teacher Chat
- **12 Teaching Modes**: Choose between *Simple Mode*, *Detailed Mode*, *Exam Focus*, *Quick Revision*, *Explain With Example*, *Teach From Scratch*, *Active Recall*, *Flashcards*, *Practice Quiz*, *Weak Areas*, *Compare Concepts*, and *Ask Anything*.
- **Grounded Evidence Cards**: Every answer grounded in the lecture includes clickable timestamp links (e.g., `[14:32]`) and slide thumbnail cards. Clicking any card opens the high-resolution slide modal!
- **Voice Dictation**: Click the microphone icon next to the message input to dictate your questions hands-free.

### 2.2 Human Control Bar
Located prominently at the top of your screen:
- **`[ PAUSE AGENT ]`**: Halts frame sampling and speech capture whenever you want to pause your study session or take a break.
- **`[ RESUME AGENT ]`**: Seamlessly resumes multimodal observation.
- **`[ STOP ]`**: Completes the session and marks it ready for study artifact generation.
- **`[ COMMAND ]`**: Enter natural language commands (e.g., *"Generate PPT"*, *"Explain what I just learned"*, *"Make notes"*).
- **Vision & Audio Toggles**: Switch visual analysis or audio processing on or off as needed.

### 2.3 Session Dashboard
View your overall learning metrics:
- Processed lecture duration.
- Verified conceptual units extracted.
- Unique deduplicated slide diagrams captured.
- Identified weak areas to reinforce before exams.
- One-click shortcuts to generate PPTs, PDF reports, or start practice quizzes.

### 2.4 Smart Slide Collection
- Browse all unique slide images captured during the lecture.
- Automatically deduplicated: you will never see 50 copies of the same slide.
- Filter by category (`DIAGRAM`, `TABLE`, `CODE`, `SLIDE`).
- Click any slide to inspect OCR extracted text and click **"Teach This Slide"** to discuss it with your AI Teacher.

### 2.5 Study Artifacts & PPT Generation
- **PowerPoint (.pptx)**: Choose your style (*Teaching*, *Exam Revision*, *Quick Summary*, *Detailed*, *Visual*) and slide count (5–15). Click **"Generate Presentation"** and download a complete presentation deck with embedded lecture diagrams!
- **Teaching Report PDF**: Comprehensive study guide containing executive summary, definitions table, mechanisms, exam highlights, and self-check questions.
- **Visual Study Pack PDF**: High-yield visual compilation of all captured lecture slides, timestamps, and OCR text.

### 2.6 Practice & Quiz Mode
- Ingest practice quizzes or upload a Quiz PDF.
- Answer multiple choice questions in a distraction-free practice environment.
- Receive instant feedback explaining why choices are correct or incorrect.
- Click **"Teach This Concept in AI Tutor"** to immediately get remedial lessons on questions you missed!
