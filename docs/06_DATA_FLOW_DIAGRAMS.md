# Data Flow Diagrams (DFD)
## Project: LearnLens AI

---

## 1. DFD Level 0 (Context Diagram)

```mermaid
flowchart TD
    Human[Human Learner]
    Chrome[Chrome Browser Educational Tab]
    LLAI[0. LearnLens AI Core System]

    Chrome -->|Video Frames & Tab Audio Stream| LLAI
    Human -->|Session Configuration & Natural Language Queries| LLAI
    Human -->|Human Control Commands: Pause/Resume/Stop| LLAI

    LLAI -->|Source-Grounded AI Tutoring Answers & Citations| Human
    LLAI -->|Generated 16:9 Presentation Decks (.pptx)| Human
    LLAI -->|Visual Study Packs & AI Teaching Reports (.pdf)| Human
    LLAI -->|Diagnostic Knowledge Gap Feedback| Human
```

---

## 2. DFD Level 1 (Subsystem Deconstruction)

```mermaid
flowchart TD
    Human[Human Learner]
    Source[Chrome Educational Tab]

    subgraph Data Stores
        D1[(Sessions DB)]
        D2[(Transcript Store)]
        D3[(Frame & Visual Store)]
        D4[(Session Vector Index)]
        D5[(Learner Profile DB)]
    end

    Source -->|Raw Audio Stream| P1[1.0 Audio Capture & Whisper Engine]
    Source -->|Raw Video Frames| P2[2.0 Visual Frame Ingestion & dHash]

    P1 -->|Timestamped Segments| D2
    P2 -->|Deduplicated Frames| D3

    D2 --> P3[3.0 Knowledge Extraction Engine]
    D3 --> P3

    P3 -->|Extracted Concepts & Definitions| D1
    P3 -->|Subword Embeddings| D4

    Human -->|Student Doubt / Prompt| P4[4.0 Session-Scoped RAG & AI Teacher]
    D1 --> P4
    D2 --> P4
    D3 --> P4
    D4 --> P4
    P4 -->|Grounded Answers & Citations| Human
    P4 -->|Update Queries & Viewed Concepts| D5

    D1 --> P5[5.0 Presentation & Document Generators]
    D3 --> P5
    P5 -->|Downloadable PPTX & PDF Reports| Human

    Human -->|Pause / Resume / Stop / Commands| P6[6.0 Task Agent & State Machine]
    P6 -->|State Transitions| D1
```

---

## 3. DFD Level 2 (Multimodal Processing Detail)

```mermaid
flowchart TD
    IncomingFrame[Incoming Raw Video Frame] --> CalcHash[2.1 Compute Difference Hash dHash]
    CalcHash --> FetchLast[2.2 Query Previous Frame Hash]
    FetchLast --> HammingCheck{2.3 Hamming Distance > Threshold?}

    HammingCheck -- No --> Discard[Drop Stationary Frame]
    HammingCheck -- Yes --> SaveImg[2.4 Save High-Res JPEG & Thumbnail]

    SaveImg --> Fork[Parallel Inspection]
    
    Fork --> RunOCR[2.5 Tesseract / PaddleOCR Engine]
    Fork --> RunCV[2.6 OpenCV Edge & Contour Classifier]
    Fork --> RunVLM[2.7 Local VLM Semantic Tagging]

    RunOCR --> TextBuffer[Visible Text & Code Stream]
    RunCV --> VisualCat[Category: DIAGRAM/TABLE/SLIDE]
    RunVLM --> SemanticDesc[Visual Description & Importance Score]

    TextBuffer --> Fuse[2.8 Multimodal Knowledge Fusion]
    VisualCat --> Fuse
    SemanticDesc --> Fuse

    AudioStream[Incoming Tab Audio] --> AudioChunk[2.9 5-Second Buffer]
    AudioChunk --> WhisperSTT[2.10 faster-whisper Transcription]
    WhisperSTT --> Segments[Timestamped Text Segments]

    Segments --> Fuse
    Fuse --> BuildConcepts[2.11 Concept, Definition & Evidence Synthesizer]
    BuildConcepts --> StoreDB[(Session Database & Vectors)]
```
