# Software Requirements Specification (SRS)
## Project: LearnLens AI
### Tagline: *"Show your AI what you are learning."*

---

## 1. Introduction
LearnLens AI is an advanced, local-first personal learning environment and multimodal AI teacher. The system allows a human learner to explicitly grant observation access to an active Chrome browser tab, window, or desktop display. LearnLens AI continuously captures, transcribes, analyzes, and indexes educational content into a private, session-scoped knowledge base, providing an interactive, ChatGPT-like personalized tutoring experience.

## 2. Purpose
The primary objective of LearnLens AI is **accelerated human learning**. Traditional educational video consumption requires learners to watch hours of lectures, manually pause for note-taking, search across slides for diagrams, and struggle to locate answers to specific doubts. LearnLens AI transforms user-authorized learning sources into structured, searchable knowledge, automated slide presentations (PPT), comprehensive study guides (PDF), and grounded interactive AI tutoring.

## 3. Scope
LearnLens AI functions as a universal educational intelligence engine independent of specific platforms (such as Coursera, YouTube, Fortinet Training Institute, Forage, or Udemy). It operates locally on the user's workstation, utilizing local-first inference for audio transcription (faster-whisper), computer vision / OCR, session-scoped vector retrieval (RAG), and local language models via Ollama or built-in heuristic fallbacks.

## 4. Product Perspective
LearnLens AI sits alongside the user's browser environment:
```
USER-AUTHORIZED CHROME SOURCE
        ↓
MULTIMODAL OBSERVATION (Audio + Video Frames + Screen OCR)
        ↓
UNDERSTANDING & DEDUPLICATION (dHash + VLM + Heuristics)
        ↓
SESSION-SCOPED KNOWLEDGE BASE (SQLite + Vector Index)
        ↓
RAG + LEARNER MEMORY
        ↓
PERSONAL AI TEACHER (12 Teaching Modes)
        ↓
STUDY ARTIFACTS (PowerPoint PPTX, Visual PDF, Teaching Report PDF, Practice Quiz)
```

## 5. Product Functions
1. **Universal Source Capture**: Native browser display media picker for Chrome tabs, windows, or screen.
2. **Local Audio Transcription**: Timestamped, segment-level speech-to-text with speaker identification.
3. **Smart Screenshot Intelligence**: Perceptual difference hashing (dHash) to filter redundant frames.
4. **Visual Classification & OCR**: Automated categorization into DIAGRAM, SLIDE, CODE, TABLE, or DEFINITION.
5. **Session-Scoped RAG**: Partitioned knowledge namespaces preventing cross-contamination across unrelated courses.
6. **AI Teacher Dialogue**: 12 pedagogical modes with exact timestamp citations and slide thumbnail evidence.
7. **Human Interrupt & Control**: Prominent Pause, Resume, Stop, and natural language command execution.
8. **Automated Presentation Generation**: Python-pptx generation with 5 professional layout styles.
9. **Dual PDF Publication**: Visual Study Pack (PDF A) and AI Teaching Report (PDF B).
10. **Quiz PDF Import & Practice Mode**: Formative assessment preparation without unauthorized test botting.
11. **Learner Memory Tracking**: Mastery profiling, doubt tracking, and knowledge gap remediation.
12. **Offline Video Processing**: Local ingestion of MP4, MKV, WebM, and MOV video files.

## 6. User Classes
- **Student / Self-Directed Learner**: Primary user studying online courses, technical documentation, or lectures.
- **Certification Candidate**: Learner preparing for high-stakes exams (e.g., Fortinet NSE, AWS, CompTIA).
- **Educator / Mentor**: User generating structured PPT decks and revision packs from raw instructional material.

## 7. Operating Environment
- **Operating Systems**: Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+).
- **Browsers**: Google Chrome 110+, Chromium-based browsers (Edge, Brave).
- **Runtimes**: Python 3.10+, Node.js v18+.

## 8. Functional Requirements (FR)

| Identifier | Requirement Statement |
| :--- | :--- |
| **FR-01** | The system shall allow the user to initiate a new learning session with custom title and platform metadata. |
| **FR-02** | The system shall invoke the browser's native `getDisplayMedia` picker to obtain explicit user permission for tab/window capture. |
| **FR-03** | The system shall capture permitted video frames at periodic intervals and stream them to the local processing pipeline. |
| **FR-04** | The system shall capture audio from the authorized source and generate timestamped transcript segments locally. |
| **FR-05** | The system shall compute perceptual difference hashes (dHash) to automatically deduplicate stationary or redundant frames. |
| **FR-06** | The system shall perform Optical Character Recognition (OCR) on extracted visual frames. |
| **FR-07** | The system shall extract structured concepts containing name, definition, mechanisms, evidence timestamps, and exam importance. |
| **FR-08** | The system shall maintain session-scoped vector indices and inverted keyword tables for local RAG retrieval. |
| **FR-09** | The system shall provide an interactive ChatGPT-style conversational tutor interface. |
| **FR-10** | The system shall ground all tutor explanations in captured source timestamps and display clickable thumbnail evidence. |
| **FR-11** | The system shall allow the human user to pause or interrupt agent processing at any moment. |
| **FR-12** | The system shall allow the human user to resume paused processing without losing existing session state. |
| **FR-13** | The system shall generate structured PowerPoint (.pptx) presentations containing captured visuals and key insights. |
| **FR-14** | The system shall compile and export publication-ready PDF documents (Visual Study Pack & AI Teaching Report). |
| **FR-15** | The system shall import assessment quiz PDFs and extract questions, options, and explanations. |
| **FR-16** | The system shall provide an interactive practice mode that records user answers and diagnoses weak concepts. |
| **FR-17** | The system shall allow pinning of concepts, messages, and screenshots to the study dashboard. |
| **FR-18** | The system shall support global keyword and concept search across all saved learning sessions. |
| **FR-19** | The system shall allow users to delete any session, purging all associated database records, frames, and exports. |
| **FR-20** | The system shall ingest and process local offline video files (MP4, MKV, WebM) without uploading data to external clouds. |
| **FR-21** | The system shall provide 12 specialized pedagogical modes (Simple, Detailed, Exam Focus, Active Recall, Flashcards, etc.). |
| **FR-22** | The system shall interpret natural language commands ("Pause", "Generate PPT", "Explain what I learned", "Make notes"). |
| **FR-23** | The system shall provide real-time bidirectional WebSocket event synchronization for transcripts, frames, and agent states. |
| **FR-24** | The system shall include an instant seedable educational demo session for evaluation without requiring external model servers. |

## 9. Non-Functional Requirements (NFR)
- **NFR-01: Privacy**: All captured video, audio, transcripts, and database tables must reside strictly on the local machine.
- **NFR-02: Performance**: Frame deduplication must complete in under 50 milliseconds per frame on standard quad-core CPUs.
- **NFR-03: Responsiveness**: RAG retrieval and initial tutor synthesis must begin within 1.5 seconds of user query submission.
- **NFR-04: Availability**: The application must function completely offline when using local heuristic synthesis or local Ollama instances.
- **NFR-05: Modularity**: Model providers (LLM, VLM, OCR, Transcription, Embedding) must adhere to abstract base class interfaces.

## 10. External Interfaces
- **Web UI**: Modern single-page application built with React, TypeScript, and Tailwind CSS.
- **REST API**: HTTP JSON API exposed via FastAPI at `http://127.0.0.1:8000/api`.
- **WebSocket**: Bidirectional JSON streaming endpoint at `ws://127.0.0.1:8000/ws/session/{session_id}`.
- **Chrome Extension**: Manifest V3 extension featuring background service worker and responsive side panel.

## 11. Hardware Requirements
- **Minimum**: Dual-core x86_64 or Apple Silicon CPU, 8 GB RAM, 2 GB available disk space.
- **Recommended**: 8-core CPU, 16 GB RAM, NVIDIA RTX GPU with 6 GB+ VRAM for accelerated local VLM/Whisper models.

## 12. Software Requirements
- Python 3.10 or higher.
- Node.js v18.0 or higher.
- Modern Chromium-based browser (Chrome, Edge, Brave).

## 13. AI Requirements
- Pluggable LLM interface supporting local Ollama (`qwen2.5`, `llama3`) and zero-dependency heuristic synthesis fallback.
- Pluggable VLM interface supporting vision models (`qwen2.5-vl`, `llava`) and OpenCV contour complexity heuristics.
- Pluggable transcription interface supporting `faster-whisper` and browser Web Speech API streaming.

## 14. Browser Integration Requirements
- Must utilize standard `navigator.mediaDevices.getDisplayMedia` API.
- Must clearly prompt user with native browser picker.
- Must honor tab audio capture permissions.

## 15. Data Requirements
- Relational schema stored in SQLite (`data/learnlens.db`).
- File storage in partitioned session folders (`data/sessions/<session_id>/...`).
- Automated JSON serialization of array attributes.

## 16. Security Requirements
- Zero storage or transmission of user browser cookies, session tokens, passwords, or authentication credentials.
- Input validation on all API endpoints using Pydantic models.
- CORS restricted to localhost origins and Chrome extension protocol.

## 17. Privacy Requirements
- User must explicitly choose which tab or window is shared.
- Video stream immediately terminates when the user clicks "Stop Sharing" or the application's "Stop" button.
- One-click total purge of session data and disk files.

## 18. Performance Requirements
- Support continuous capture of educational lectures up to 4 hours in duration.
- Memory consumption must not exceed 1.2 GB during full multimodal processing.

## 19. Reliability Requirements
- Graceful degradation: if Ollama or GPU is unavailable, system must automatically switch to local heuristic tutoring without crashing.
- Database transactions must maintain ACID compliance.

## 20. Usability Requirements
- Clean, dark-mode ChatGPT-style UI with intuitive iconography.
- Clickable timestamp links that instantly jump to lecture slides.
- No developer jargon or technical debug logs exposed in the primary user interface.

## 21. Constraints
- System must run on local commodity hardware without mandatory cloud subscriptions.
- Browser security restrictions prevent silent capture without user interaction.

## 22. Assumptions
- The user has authenticated into their target educational website in Chrome prior to launching capture.
- The user's audio output device routes tab sound through the shared display stream.

## 23. Dependencies
- FastAPI, Uvicorn, SQLite3, python-pptx, ReportLab, PyMuPDF, OpenCV, Pillow, PyTesseract, React, Vite, Tailwind CSS.

## 24. Acceptance Criteria
- Full verification of the 40-step acceptance test: from tab capture, Whisper transcription, and slide deduplication to AI Teacher tutoring, PPT generation, PDF generation, and quiz practice gap diagnosis.
