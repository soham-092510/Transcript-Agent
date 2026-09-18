# Deployment Diagram
## Project: LearnLens AI

---

## 1. Local-First Workstation Deployment Topology

```mermaid
deploymentDiagram
    node "User Workstation [Windows 10/11, macOS, Linux]" as Workstation {
        
        node "Web Browser [Google Chrome / Chromium]" as BrowserNode {
            artifact "LearnLens React Studio\n[http://localhost:5173]" as WebStudio
            artifact "Chrome DisplayMedia API\n[Tab / Window Screen Capture]" as CaptureAPI
            artifact "LearnLens Companion Extension\n[Manifest V3 Side Panel]" as Ext
        }

        node "Python Runtime Environment [Python 3.10+]" as PyRuntime {
            artifact "FastAPI Application Server\n[Uvicorn on 127.0.0.1:8000]" as APIServer
            artifact "WebSocket Connection Manager\n[127.0.0.1:8000/ws]" as WSServer
            artifact "Perceptual Deduplication & OCR Engine" as VisionEngine
            artifact "python-pptx & ReportLab Generators" as DocGenerators
            artifact "faster-whisper Engine [Optional GPU]" as WhisperEngine
        }

        node "Local Model Runtime [Optional]" as OllamaNode {
            artifact "Ollama Server\n[http://localhost:11434]" as OllamaSvc
            artifact "qwen2.5 / llama3 weights" as LLMWeights
            artifact "qwen2.5-vl vision weights" as VLMWeights
        }

        node "Local Workstation Storage" as StorageNode {
            database "SQLite Database\n[data/learnlens.db]" as SQLiteDB
            folder "Session File Storage\n[data/sessions/<session_id>/]" as SessionFolder {
                file "Screenshots & Thumbnails" as Frames
                file "Generated PPTX & PDFs" as Exports
                file "Vector Inverted Index" as Vectors
            }
        }
    }

    WebStudio --> APIServer : HTTP / REST API
    WebStudio --> WSServer : WebSocket Stream
    CaptureAPI --> WebStudio : MediaStream
    Ext --> APIServer : HTTP Queries

    APIServer --> SQLiteDB : Read / Write Metadata
    APIServer --> SessionFolder : Store Assets
    APIServer --> OllamaSvc : Inference via HTTP
    APIServer --> DocGenerators : Invoke Creation
    WSServer --> VisionEngine : Pipe Frames
    WSServer --> WhisperEngine : Pipe Audio
```
