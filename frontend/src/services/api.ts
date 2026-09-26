import {
  LearningSession,
  ChatMessage,
  Concept,
  FrameCapture,
  TranscriptSegment,
  QuizQuestion,
  LearnerProfile,
  SystemStatus,
  TeacherMode
} from '../types';

export const getApiBase = (): string => {
  let apiUrl = (import.meta as any).env?.VITE_API_URL;
  if (apiUrl && typeof apiUrl === 'string' && apiUrl.trim()) {
    apiUrl = apiUrl.trim();
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `https://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/+$/, '');
    if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl}/api`;
    }
    return apiUrl;
  }
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return 'http://127.0.0.1:8000/api';
};

export const API_BASE = getApiBase();

export const api = {
  // System Status & Demo
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/system/status`);
    return res.json();
  },

  async seedDemo(): Promise<{ status: string; session_id: string; message: string }> {
    const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
    return res.json();
  },

  // Sessions
  async listSessions(): Promise<LearningSession[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    return res.json();
  },

  async getSession(id: string): Promise<LearningSession> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    if (!res.ok) throw new Error('Session not found');
    return res.json();
  },

  async createSession(title: string, source_platform: string = 'Chrome Tab', source_url_or_title: string = 'Authorized Educational Source'): Promise<LearningSession> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, source_platform, source_url_or_title }),
    });
    return res.json();
  },

  async updateSession(id: string, updates: Partial<LearningSession>): Promise<any> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async deleteSession(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Transcript
  async getTranscript(sessionId: string): Promise<TranscriptSegment[]> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/transcript`);
    return res.json();
  },

  // Frames
  async getFrames(sessionId: string): Promise<FrameCapture[]> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/frames`);
    return res.json();
  },

  getFrameImageUrl(frameId: string): string {
    return `${API_BASE}/frames/${frameId}/image`;
  },

  getFrameThumbnailUrl(frameId: string): string {
    return `${API_BASE}/frames/${frameId}/thumbnail`;
  },

  // Concepts
  async getConcepts(sessionId: string): Promise<Concept[]> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/concepts`);
    return res.json();
  },

  // Chat / AI Teacher
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/chat`);
    return res.json();
  },

  async sendMessage(sessionId: string, message: string, mode: TeacherMode = 'simple', cross_session: boolean = false): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message, mode, cross_session }),
    });
    return res.json();
  },

  // Human Control Commands
  async sendCommand(sessionId: string, command: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, command }),
    });
    return res.json();
  },

  async pauseAgent(sessionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/pause`, { method: 'POST' });
    return res.json();
  },

  async resumeAgent(sessionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/resume`, { method: 'POST' });
    return res.json();
  },

  async stopAgent(sessionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/stop`, { method: 'POST' });
    return res.json();
  },

  // Export generation
  async generatePPT(sessionId: string, style: string = 'teaching', slideCount: number = 8): Promise<{ status: string; filename: string; download_url: string }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/generate-ppt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, style, slide_count: slideCount }),
    });
    return res.json();
  },

  async generatePDF(sessionId: string, pdfType: 'teaching_report' | 'visual_pack'): Promise<{ status: string; filename: string; download_url: string }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, pdf_type: pdfType }),
    });
    return res.json();
  },

  // Quiz & Practice
  async getQuizQuestions(sessionId: string): Promise<QuizQuestion[]> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/quiz`);
    return res.json();
  },

  async generateQuizQuestions(sessionId: string): Promise<{ status: string; count: number; questions: QuizQuestion[] }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/quiz/generate`, {
      method: 'POST',
    });
    return res.json();
  },

  async createCustomQuiz(
    sessionId: string,
    conceptName: string,
    numQuestions: number,
    difficulty: string = 'MEDIUM'
  ): Promise<{ status: string; count: number; questions: QuizQuestion[] }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/quiz/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_name: conceptName,
        num_questions: numQuestions,
        difficulty: difficulty,
      }),
    });
    return res.json();
  },

  async submitQuizAnswer(questionId: string, selectedOptionIndex: number): Promise<any> {
    const res = await fetch(`${API_BASE}/quiz/${questionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_option_index: selectedOptionIndex }),
    });
    return res.json();
  },

  async importQuizPdf(sessionId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/quiz/import`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  // Learner Profile
  async getLearnerProfile(sessionId: string): Promise<LearnerProfile> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/learner-profile`);
    return res.json();
  },

  // Global Search & Pinning
  async search(query: string, sessionId?: string): Promise<{ concepts: any[]; transcripts: any[]; frames: any[] }> {
    const url = new URL(`${API_BASE}/search`);
    url.searchParams.set('q', query);
    if (sessionId) url.searchParams.set('session_id', sessionId);
    const res = await fetch(url.toString());
    return res.json();
  },

  async togglePin(itemType: string, itemId: string, isPinned: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: itemType, item_id: itemId, is_pinned: isPinned }),
    });
    return res.json();
  },

  // Offline video import
  async importOfflineVideo(file: File, title?: string): Promise<{ status: string; session_id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await fetch(`${API_BASE}/video/import`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  // HyperIngest: Batch Multi-Video 10-15 Min Processing
  async hyperIngestVideos(files: File[], title?: string): Promise<{ status: string; session_id: string; total_videos: number }> {
    const formData = new FormData();
    files.forEach((f) => {
      formData.append('files', f);
    });
    if (title) formData.append('title', title);
    const res = await fetch(`${API_BASE}/video/hyper-ingest`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async getHyperIngestStatus(): Promise<{
    is_running: boolean;
    current_video_idx: number;
    total_videos: number;
    current_video_name: string;
    progress_pct: number;
    total_slides_captured: number;
    speed_multiplier: string;
    status_message: string;
    session_id: string | null;
  }> {
    const res = await fetch(`${API_BASE}/video/hyper-ingest/status`);
    return res.json();
  },

  async hyperIngestUrl(url: string, title?: string): Promise<{ status: string; session_id: string; message: string }> {
    const res = await fetch(`${API_BASE}/video/hyper-ingest-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    });
    return res.json();
  },

  // 16:9 Video-Size Only Slide Exports
  async exportSlideOnlyPdf(sessionId: string): Promise<{ status: string; filename: string; download_url: string }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/export/slide-pdf`, {
      method: 'POST',
    });
    return res.json();
  },

  async exportSlideOnlyPptx(sessionId: string): Promise<{ status: string; filename: string; download_url: string }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/export/slide-pptx`, {
      method: 'POST',
    });
    return res.json();
  },

  // System Settings
  async getSystemSettings(): Promise<{
    fast_mode: boolean;
    default_llm_model: string;
    enable_live_vlm: boolean;
    enable_live_whisper: boolean;
    ollama_timeout_sec: number;
    installed_models: string[];
  }> {
    const res = await fetch(`${API_BASE}/system/settings`);
    return res.json();
  },

  async updateSystemSettings(settings: {
    fast_mode?: boolean;
    default_model?: string;
    enable_live_vlm?: boolean;
    enable_live_whisper?: boolean;
  }): Promise<{ status: string; settings: any }> {
    const res = await fetch(`${API_BASE}/system/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  }
};
