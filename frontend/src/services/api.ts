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

const API_BASE = 'http://localhost:8000/api';

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
  }
};
