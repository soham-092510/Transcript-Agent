export interface CaptureCallbacks {
  onFrameCaptured: (base64Image: string, timestampSec: number) => void;
  onTranscriptChunk?: (text: string, timestampSec: number) => void;
  onStopped: () => void;
}

export class BrowserMediaCaptureManager {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private captureIntervalId: any = null;
  private startTime: number = 0;
  private recognition: any = null;
  private callbacks: CaptureCallbacks | null = null;
  private speechDenied: boolean = false;

  async startCapture(callbacks: CaptureCallbacks, options?: { enableMic?: boolean }) {
    this.callbacks = callbacks;
    this.speechDenied = false;
    this.startTime = Date.now();

    try {
      // 1. Trigger Chrome's native picker (Chrome Tab / Window / Entire Screen)
      // Request both video and audio
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: 'browser',
        },
        audio: {
          suppressLocalAudioPlayback: false,
        }
      } as any;

      this.mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      // Listen for user clicking "Stop sharing" bar in Chrome
      const videoTrack = this.mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopCapture();
        };
      }

      // 2. Setup video and canvas for periodic frame extraction
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.muted = true;
      await this.videoElement.play();

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 1280;
      this.canvasElement.height = 720;

      // 3. Start frame sampling (every 3 seconds)
      this.captureIntervalId = setInterval(() => {
        this.sampleCurrentFrame();
      }, 3000);

      // Initial frame immediately
      setTimeout(() => this.sampleCurrentFrame(), 800);

      // 4. Setup Speech Recognition if available for real-time speech transcription
      this.setupSpeechRecognition();

      return true;
    } catch (err) {
      console.error('User cancelled or screen capture failed:', err);
      this.stopCapture();
      return false;
    }
  }

  private sampleCurrentFrame() {
    if (!this.videoElement || !this.canvasElement || !this.mediaStream || !this.callbacks) {
      return;
    }
    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
    const base64Data = this.canvasElement.toDataURL('image/jpeg', 0.82);
    const timestampSec = (Date.now() - this.startTime) / 1000.0;
    this.callbacks.onFrameCaptured(base64Data, timestampSec);
  }

  private setupSpeechRecognition() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript.trim() && this.callbacks?.onTranscriptChunk) {
            const timestampSec = (Date.now() - this.startTime) / 1000.0;
            this.callbacks.onTranscriptChunk(finalTranscript.trim(), timestampSec);
          }
        };

        this.recognition.onerror = (e: any) => {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            this.speechDenied = true;
          }
          console.warn('Speech recognition status:', e.error);
        };

        this.recognition.onend = () => {
          // Restart if still active and permission not denied
          if (!this.speechDenied && this.mediaStream && this.mediaStream.active) {
            try { this.recognition.start(); } catch (_) {}
          }
        };

        this.recognition.start();
      } catch (e) {
        console.warn('Speech recognition not initiated:', e);
      }
    }
  }

  stopCapture() {
    this.speechDenied = false;
    if (this.captureIntervalId) {
      clearInterval(this.captureIntervalId);
      this.captureIntervalId = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (_) {}
      this.recognition = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    if (this.callbacks) {
      this.callbacks.onStopped();
      this.callbacks = null;
    }
  }

  isCapturing(): boolean {
    return !!(this.mediaStream && this.mediaStream.active);
  }
}

export const mediaCaptureManager = new BrowserMediaCaptureManager();
