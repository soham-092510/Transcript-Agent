import { TranscriptSegment, FrameCapture, Concept } from '../types';

export interface SessionWSEvents {
  onTranscriptReceived?: (segment: TranscriptSegment, newConcepts: Concept[]) => void;
  /** Called while the current 60-second window is still accumulating */
  onTranscriptInterim?: (text: string, timestampFormatted: string, speaker: string) => void;
  onFrameAnalyzed?: (frame: FrameCapture) => void;
  onConceptsUpdated?: (newConcepts: Concept[]) => void;
  onStatusChange?: (status: string) => void;
}

export class SessionWebSocketClient {
  private socket: WebSocket | null = null;
  private sessionId: string;
  private events: SessionWSEvents;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isManuallyClosed: boolean = false;
  private reconnectDelay: number = 1000;

  constructor(sessionId: string, events: SessionWSEvents) {
    this.sessionId = sessionId;
    this.events = events;
  }

  connect() {
    this.isManuallyClosed = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const sanitizeWsHost = (rawHost: string): string => {
      let h = (rawHost || '').trim().replace(/\/api\/?$/, '');
      if (
        h === 'transcript-agent-backend' ||
        h === 'http://transcript-agent-backend' ||
        h === 'https://transcript-agent-backend' ||
        h === 'transcript-agent-backend/api' ||
        h === 'http://transcript-agent-backend/api' ||
        h === 'https://transcript-agent-backend/api'
      ) {
        h = 'transcript-agent-backend.onrender.com';
      }
      if (h.includes('transcript-agent-backend') && !h.includes('.onrender.com')) {
        h = h.replace('transcript-agent-backend', 'transcript-agent-backend.onrender.com');
      }
      if (h.startsWith('http://')) h = h.replace(/^http:\/\//, 'ws://');
      else if (h.startsWith('https://')) h = h.replace(/^https:\/\//, 'wss://');
      else if (!h.startsWith('ws://') && !h.startsWith('wss://')) h = `wss://${h}`;
      return h.replace(/\/+$/, '');
    };

    let wsUrl: string;

    // 1. Check custom localStorage override (incognito-safe)
    let savedBackend: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        savedBackend = window.localStorage.getItem('LEARNLENS_BACKEND_URL');
        if (
          savedBackend &&
          (savedBackend === 'transcript-agent-backend' ||
            savedBackend.includes('https://transcript-agent-backend/api'))
        ) {
          window.localStorage.removeItem('LEARNLENS_BACKEND_URL');
          savedBackend = null;
        }
      } catch (_) {}
    }

    if (savedBackend && savedBackend.trim()) {
      wsUrl = `${sanitizeWsHost(savedBackend)}/ws/session/${this.sessionId}`;
    }
    // 2. Direct static build-time environment variables
    else if (import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL) {
      const raw = (import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || '').trim();
      wsUrl = `${sanitizeWsHost(raw)}/ws/session/${this.sessionId}`;
    }
    // 3. Render cloud auto-detection
    else if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname.includes('.onrender.com')) {
      const host = window.location.hostname;
      const backendHost = host.replace(/-frontend(\.[^.]+)?\.onrender\.com/, '-backend$1.onrender.com');
      wsUrl = `wss://${backendHost}/ws/session/${this.sessionId}`;
    }
    // 4. Any external production host fallback (not localhost)
    else if (
      typeof window !== 'undefined' &&
      window.location &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      wsUrl = `wss://transcript-agent-backend.onrender.com/ws/session/${this.sessionId}`;
    }
    // 5. Local dev / same-origin fallback
    else {
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' && window.location.host ? window.location.host : '127.0.0.1:8000';
      wsUrl = `${protocol}//${host}/ws/session/${this.sessionId}`;
    }

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log(`[LearnLens WS] Connected to session ${this.sessionId}`);
        this.reconnectDelay = 1000;
        this.events.onStatusChange?.('CONNECTED');
        this.startPing();
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'transcript_received') {
            this.events.onTranscriptReceived?.(payload.segment, payload.new_concepts || []);
          } else if (payload.event === 'transcript_interim') {
            this.events.onTranscriptInterim?.(
              payload.text || '',
              payload.timestamp_formatted || '',
              payload.speaker || 'Speaker'
            );
          } else if (payload.event === 'frame_analyzed') {
            this.events.onFrameAnalyzed?.(payload.frame);
          } else if (payload.event === 'concepts_updated') {
            this.events.onConceptsUpdated?.(payload.new_concepts || []);
          }
        } catch (e) {
          console.error('[LearnLens WS] Error parsing message', e);
        }
      };

      this.socket.onclose = () => {
        this.stopPing();
        this.events.onStatusChange?.('DISCONNECTED');
        if (!this.isManuallyClosed) {
          console.log(`[LearnLens WS] Reconnecting in ${this.reconnectDelay}ms...`);
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 8000);
            this.connect();
          }, this.reconnectDelay);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[LearnLens WS] Connection status note:', err);
      };
    } catch (e) {
      console.warn('[LearnLens WS] Instantiation error:', e);
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (_) {}
      }
    }, 10000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  sendSessionStop(timestampSec: number) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          type: 'session_stop',
          timestamp_sec: timestampSec
        }));
      } catch (e) {
        console.warn('Failed to send session_stop:', e);
      }
    }
  }

  sendTranscriptChunk(text: string, timestampSec: number, speaker: string = 'Instructor') {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          type: 'transcript_chunk',
          text,
          speaker,
          timestamp_sec: timestampSec
        }));
      } catch (e) {
        console.warn('Failed to send transcript chunk:', e);
      }
    }
  }

  sendAudioChunk(audioBase64: string, timestampSec: number, speaker: string = 'Instructor') {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          type: 'audio_chunk',
          audio_base64: audioBase64,
          speaker,
          timestamp_sec: timestampSec
        }));
      } catch (e) {
        console.warn('Failed to send audio chunk:', e);
      }
    }
  }

  sendFrameCapture(imageBase64: string, timestampSec: number, force: boolean = false) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Guard against saturated buffer to prevent memory bloat
      if (this.socket.bufferedAmount > 800000 && !force) {
        return;
      }
      try {
        this.socket.send(JSON.stringify({
          type: 'frame_capture',
          image_base64: imageBase64,
          timestamp_sec: timestampSec,
          force
        }));
      } catch (e) {
        console.warn('Failed to send frame capture:', e);
      }
    }
  }

  disconnect() {
    this.isManuallyClosed = true;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      try { this.socket.close(); } catch (_) {}
      this.socket = null;
    }
  }
}
