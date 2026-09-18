# Use Case Diagram
## Project: LearnLens AI

---

## 1. Actors
1. **Human Learner**: The primary user who grants permissions, studies, asks doubts, practices quizzes, and controls the agent.
2. **Chrome Browser**: The authorized host application providing the media display stream and tab context.
3. **Local AI Runtime**: Local background engine orchestrating Whisper, OpenCV, OCR, and Ollama/heuristics.
4. **Optional Model Provider**: External or local swap-in LLM/VLM services.

---

## 2. Use Case Model

```mermaid
flowchart LR
    Learner((Human Learner))
    Chrome((Chrome Browser))
    Runtime((Local AI Runtime))

    subgraph LearnLens AI System
        UC1([Start Learning Session])
        UC2([Select & Authorize Chrome Source])
        UC3([Observe Multimodal Stream])
        UC4([Generate Timestamped Transcript])
        UC5([Deduplicate & Understand Visuals])
        UC6([Extract Structured Knowledge])
        UC7([Ask AI Teacher Doubt])
        UC8([Select Pedagogical Mode])
        UC9([Review Timestamp & Slide Citations])
        UC10([Generate PowerPoint Deck])
        UC11([Generate Study Pack PDFs])
        UC12([Import Quiz PDF])
        UC13([Execute Interactive Practice Mode])
        UC14([Review Weak Knowledge Areas])
        UC15([Pause / Resume Agent])
        UC16([Issue Natural Language Command])
        UC17([Pin Key Concept or Slide])
        UC18([Search Global History])
        UC19([Delete Session Data])
    end

    Learner --> UC1
    Learner --> UC2
    Learner --> UC7
    Learner --> UC8
    Learner --> UC9
    Learner --> UC10
    Learner --> UC11
    Learner --> UC12
    Learner --> UC13
    Learner --> UC14
    Learner --> UC15
    Learner --> UC16
    Learner --> UC17
    Learner --> UC18
    Learner --> UC19

    UC2 --> Chrome
    Chrome --> UC3
    UC3 --> Runtime
    Runtime --> UC4
    Runtime --> UC5
    Runtime --> UC6
    UC7 --> Runtime
    UC10 --> Runtime
    UC11 --> Runtime
    UC12 --> Runtime
```

---

## 3. Core Use Case Specifications

### Use Case UC-01: Start Learning & Select Source
- **Primary Actor**: Human Learner.
- **Preconditions**: Chrome browser is open with educational lecture tab.
- **Main Flow**:
  1. Learner clicks "Start Learning" in LearnLens AI.
  2. System displays platform selection and native authorization prompt.
  3. Chrome renders the native display picker (Tab / Window / Screen).
  4. Learner chooses target educational tab and checks "Share tab audio".
  5. System begins real-time observation pipeline.

### Use Case UC-07: Ask AI Teacher Doubt
- **Primary Actor**: Human Learner.
- **Preconditions**: Session has captured at least 1 minute of instructional content.
- **Main Flow**:
  1. Learner enters question into AI Teacher input field.
  2. System queries session-scoped RAG for matching concepts, speech quotes, and slide images.
  3. AI Teacher synthesizes explanation based on selected pedagogical mode.
  4. Output is rendered with exact timestamp tags and slide thumbnail cards.
  5. Learner can click any citation to inspect the original visual frame.

### Use Case UC-15: Pause and Resume Agent
- **Primary Actor**: Human Learner.
- **Preconditions**: Agent is in `OBSERVING` state.
- **Main Flow**:
  1. Learner clicks `[ PAUSE AGENT ]`.
  2. State machine transitions immediately to `PAUSED`.
  3. Frame ingestion stops while existing knowledge remains fully queryable.
  4. Learner clicks `[ RESUME AGENT ]`.
  5. State machine transitions to `OBSERVING` and frame capture resumes seamlessly.
