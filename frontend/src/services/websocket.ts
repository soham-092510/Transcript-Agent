import { TranscriptSegment, FrameCapture, Concept } from '../types';

export interface SessionWSEvents {
  onTranscriptReceived?: (segment: TranscriptSegment, newConcepts: Concept[]) => void;
  onFrameAnalyzed?: (frame: FrameCapture) => void;
  onStatusChange?: (status: string) => void;
}

export class SessionWebSocketClient {
  private socket: WebSocket | null = null;
  private sessionId: string;
  private events: SessionWSEvents;
  private reconnectTimer: any = null;

  constructor(sessionId: string, events: SessionWSEvents) {
    this.sessionId = sessionId;
    this.events = events;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' && window.location.host ? window.location.host : '127.0.0.1:8000';
    const wsUrl = `${protocol}//${host}/ws/session/${this.sessionId}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log(`[LearnLens WS] Connected to session ${this.sessionId}`);
      this.events.onStatusChange?.('CONNECTED');
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'transcript_received') {
          this.events.onTranscriptReceived?.(payload.segment, payload.new_concepts || []);
        } else if (payload.event === 'frame_analyzed') {
          this.events.onFrameAnalyzed?.(payload.frame);
        }
      } catch (e) {
        console.error('[LearnLens WS] Error parsing message', e);
      }
    };

    this.socket.onclose = () => {
      console.log(`[LearnLens WS] Disconnected from session ${this.sessionId}`);
      this.events.onStatusChange?.('DISCONNECTED');
    };

    this.socket.onerror = (err) => {
      console.error('[LearnLens WS] Error:', err);
    };
  }

  sendTranscriptChunk(text: string, timestampSec: number) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'transcript_chunk',
        text,
        timestamp_sec: timestampSec
      }));
    }
  }

  sendFrameCapture(imageBase64: string, timestampSec: number) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'frame_capture',
        image_base64: imageBase64,
        timestamp_sec: timestampSec
      }));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
