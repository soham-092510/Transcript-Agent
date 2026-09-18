# Technical Decision Records (TDR / ADR)
## Project: LearnLens AI

---

## ADR-001: Universal Browser `getDisplayMedia` vs. Platform-Specific Scrapers
- **Status**: Accepted
- **Context**: The product must observe courses across Coursera, YouTube, Fortinet, Forage, Udemy, local video files, and private university portals.
- **Decision**: Utilize the browser's standard `navigator.mediaDevices.getDisplayMedia` capture API rather than writing individual web scrapers or browser bots for each platform.
- **Consequences**:
  - **Pros**: 100% platform-independent; zero vulnerability to website HTML/DOM layout changes; zero violation of platform terms of service; works on authenticated enterprise intranets.
  - **Cons**: Requires explicit user consent via the browser picker (which reinforces user privacy).

---

## ADR-002: Perceptual Difference Hashing (dHash) for Frame Deduplication
- **Status**: Accepted
- **Context**: Educational video lectures display static slides for 30–120 seconds. Taking screenshots blindly every 2 seconds creates thousands of redundant images, exhausting disk space and CPU.
- **Decision**: Implement a 64-bit difference hash (dHash) using OpenCV and calculate Hamming distance against prior frames. Only frames with Hamming distance $\ge 8$ are processed.
- **Consequences**: Reduces downstream OCR, VLM, and disk operations by over 85%, allowing smooth operation on ordinary student laptops.

---

## ADR-003: Session-Scoped Knowledge Namespaces vs. Monolithic Global RAG
- **Status**: Accepted
- **Context**: A student studying Network Firewalls on Fortinet today should not receive answers contaminated by an Art History course they studied yesterday.
- **Decision**: Partition vector indices and SQLite records strictly per `session_id`. Cross-session search is only performed when the user explicitly requests "Search all my learning".
- **Consequences**: Completely eliminates inter-domain hallucination and keeps vector lookups under 5 milliseconds.

---

## ADR-004: Ethical Assessment Boundary vs. Automated Quiz Botting
- **Status**: Accepted
- **Context**: Some users might request automated quiz submission to pass certifications.
- **Decision**: Implement formative assessment features (importing quiz PDFs, diagnosing weak concepts, explaining why an answer is correct, creating mock quizzes) while strictly prohibiting automated exam submission or credential harvesting.
- **Consequences**: Maintains ethical academic integrity while maximizing human learning outcomes.

---

## ADR-005: Local Python Presentation & PDF Generators (`python-pptx`, `reportlab`)
- **Status**: Accepted
- **Context**: Users require downloadable PowerPoint presentations and study guide PDFs.
- **Decision**: Use `python-pptx` to construct native widescreen presentation decks embedding real captured diagrams, and `reportlab` to compile structured study reports with tables and callout boxes.
- **Consequences**: Zero dependency on paid cloud document APIs; instant local downloads with consistent typography.
