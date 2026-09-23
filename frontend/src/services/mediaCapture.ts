export interface CaptureCallbacks {
  onFrameCaptured: (base64Image: string, timestampSec: number, force?: boolean) => void;
  onTranscriptChunk?: (text: string, timestampSec: number, speaker?: string) => void;
  onAudioChunk?: (base64Audio: string, timestampSec: number, speaker?: string) => void;
  onStopped: () => void;
}

class BackgroundWorkerTimer {
  private worker: Worker | null = null;

  start(intervalMs: number, onTick: () => void): boolean {
    this.stop();
    try {
      const code = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            timer = setInterval(function() {
              self.postMessage('tick');
            }, ${intervalMs});
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
          }
        };
      `;
      const blob = new Blob([code], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          onTick();
        }
      };
      this.worker.postMessage('start');
      return true;
    } catch (e) {
      console.warn('Web Worker timer unavailable, falling back to interval:', e);
      return false;
    }
  }

  stop() {
    if (this.worker) {
      try {
        this.worker.postMessage('stop');
        this.worker.terminate();
      } catch (_) {}
      this.worker = null;
    }
  }
}

export class BrowserMediaCaptureManager {
  private mediaStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private workerTimer: BackgroundWorkerTimer = new BackgroundWorkerTimer();
  private fallbackIntervalId: any = null;
  private startTime: number = 0;
  private recognition: any = null;
  private callbacks: CaptureCallbacks | null = null;
  private speechDenied: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isCapturingFrame: boolean = false;

  async startCapture(callbacks: CaptureCallbacks, options?: { enableMic?: boolean }) {
    this.callbacks = callbacks;
    this.speechDenied = false;
    this.startTime = Date.now();

    try {
      // 1. Proactively request mic permission so speech recognition & mic mixing work reliably
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (micErr) {
        console.info('Microphone direct access not granted, continuing with tab audio:', micErr);
      }

      // 2. Trigger Chrome's native picker (Chrome Tab / Window / Entire Screen)
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

      // 3. Setup video and canvas for periodic frame extraction
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.muted = true;
      await this.videoElement.play();

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 1280;
      this.canvasElement.height = 720;

      // 4. Start background-safe worker frame sampling (every 2.5 seconds)
      // Fix: ONLY run one timer. Fallback to setInterval only if Web Worker failed!
      const workerStarted = this.workerTimer.start(2500, () => {
        this.sampleCurrentFrame(false);
      });

      if (!workerStarted) {
        this.fallbackIntervalId = setInterval(() => {
          this.sampleCurrentFrame(false);
        }, 2500);
      }

      // Initial frame immediately
      setTimeout(() => this.sampleCurrentFrame(true), 600);

      // 5. Setup Audio Streaming (Meeting tab audio + mic)
      this.setupAudioRecording();

      // 6. Setup Speech Recognition if available for real-time speech transcription
      this.setupSpeechRecognition();

      return true;
    } catch (err) {
      console.error('User cancelled or screen capture failed:', err);
      this.stopCapture();
      return false;
    }
  }

  sampleCurrentFrame(force: boolean = false) {
    if (!this.videoElement || !this.canvasElement || !this.mediaStream || !this.callbacks) {
      return;
    }
    if (this.isCapturingFrame && !force) {
      return;
    }
    this.isCapturingFrame = true;
    try {
      const ctx = this.canvasElement.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
      const base64Data = this.canvasElement.toDataURL('image/jpeg', 0.82);
      const timestampSec = (Date.now() - this.startTime) / 1000.0;
      this.callbacks.onFrameCaptured(base64Data, timestampSec, force);
    } finally {
      this.isCapturingFrame = false;
    }
  }

  forceCapture() {
    this.sampleCurrentFrame(true);
  }

  private setupAudioRecording() {
    try {
      // Gather audio tracks from tab and mic
      const audioTracks: MediaStreamTrack[] = [];
      if (this.mediaStream) {
        this.mediaStream.getAudioTracks().forEach(t => audioTracks.push(t));
      }
      if (this.micStream) {
        this.micStream.getAudioTracks().forEach(t => audioTracks.push(t));
      }

      if (audioTracks.length === 0) {
        console.info('No audio tracks attached to display media stream.');
        return;
      }

      const combinedStream = new MediaStream(audioTracks);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');

      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

      this.mediaRecorder.ondataavailable = async (e: BlobEvent) => {
        if (e.data && e.data.size > 2000 && this.callbacks?.onAudioChunk) {
          const timestampSec = (Date.now() - this.startTime) / 1000.0;
          const reader = new FileReader();
          reader.onloadend = () => {
            const b64 = reader.result as string;
            if (b64 && this.callbacks?.onAudioChunk) {
              this.callbacks.onAudioChunk(b64, timestampSec, 'Speaker');
            }
          };
          reader.readAsDataURL(e.data);
        }
      };

      // Emit audio chunk every 5 seconds for Whisper transcription
      this.mediaRecorder.start(5000);
    } catch (e) {
      console.warn('Audio streaming setup note:', e);
    }
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
            this.callbacks.onTranscriptChunk(finalTranscript.trim(), timestampSec, 'Speaker');
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
    this.workerTimer.stop();
    if (this.fallbackIntervalId) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (_) {}
      this.mediaRecorder = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (_) {}
      this.recognition = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
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
