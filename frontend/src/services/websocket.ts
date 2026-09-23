import { TranscriptSegment, FrameCapture, Concept } from '../types';

export interface SessionWSEvents {
  onTranscriptReceived?: (segment: TranscriptSegment, newConcepts: Concept[]) => void;
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

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' && window.location.host ? window.location.host : '127.0.0.1:8000';
    const wsUrl = `${protocol}//${host}/ws/session/${this.sessionId}`;

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
