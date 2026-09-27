export interface CaptureCallbacks {
  onFrameCaptured: (base64Image: string, timestampSec: number, force?: boolean) => void;
  onTranscriptChunk?: (text: string, timestampSec: number, speaker?: string) => void;
  onInterimTranscript?: (text: string, timestampSec: number, speaker?: string) => void;
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
  private diffCanvas: HTMLCanvasElement | null = null;
  private prevThumbData: Uint8Array | null = null;
  private workerTimer: BackgroundWorkerTimer = new BackgroundWorkerTimer();
  private fallbackIntervalId: any = null;
  private startTime: number = 0;
  private recognition: any = null;
  private recognitionRestartTimer: any = null;
  private lastWebSpeechTime: number = 0;
  private callbacks: CaptureCallbacks | null = null;
  private speechDenied: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private silentGain: GainNode | null = null;
  private isCapturingFrame: boolean = false;

  async startCapture(callbacks: CaptureCallbacks, options?: { enableMic?: boolean }) {
    this.callbacks = callbacks;
    this.speechDenied = false;
    this.startTime = Date.now();
    this.prevThumbData = null;

    try {
      // 1. Immediately launch native Chrome screen/tab picker with ZERO delays (direct response to user click)
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
      this.videoElement.playsInline = true;
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('muted', '');
      try {
        await this.videoElement.play();
      } catch (playErr) {
        console.warn('Video element play note:', playErr);
      }

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 960;
      this.canvasElement.height = 540;

      this.diffCanvas = document.createElement('canvas');
      this.diffCanvas.width = 16;
      this.diffCanvas.height = 9;

      // 3. Fast frame extraction (initial frame at 250ms, then sampling every 2.5s)
      const workerStarted = this.workerTimer.start(2500, () => {
        this.sampleCurrentFrame(false);
      });

      if (!workerStarted) {
        this.fallbackIntervalId = setInterval(() => {
          this.sampleCurrentFrame(false);
        }, 2500);
      }

      // First frame capture immediately once video is playing
      setTimeout(() => this.sampleCurrentFrame(true), 250);

      // 4. Setup Audio Streaming (Captures tab lecture audio + mic)
      this.setupAudioRecording();

      // 5. Setup native client Speech Recognition with auto-restart
      this.setupSpeechRecognition();

      // 6. Asynchronously request mic in background (NEVER blocks the screen share picker from appearing!)
      navigator.mediaDevices?.getUserMedia({ audio: true, video: false })
        .then(mic => {
          this.micStream = mic;
          this.attachMicStream(mic);
        })
        .catch(err => {
          console.info('Microphone background access note (tab audio will be used):', err.name);
        });

      return true;
    } catch (err) {
      console.error('User cancelled or screen capture failed:', err);
      this.stopCapture();
      return false;
    }
  }

  private attachMicStream(micStream: MediaStream) {
    if (!this.audioContext || this.audioContext.state === 'closed') return;
    try {
      if (micStream.getAudioTracks().length > 0 && this.audioProcessor) {
        this.micSourceNode = this.audioContext.createMediaStreamSource(micStream);
        this.micSourceNode.connect(this.audioProcessor);
      }
    } catch (e) {
      console.warn('Could not attach mic stream to audio processor:', e);
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
      // 1. Lightweight visual change detection using 16x9 downscaled canvas (0.05ms)
      if (this.diffCanvas) {
        const diffCtx = this.diffCanvas.getContext('2d');
        if (diffCtx) {
          diffCtx.drawImage(this.videoElement, 0, 0, 16, 9);
          const imgData = diffCtx.getImageData(0, 0, 16, 9).data;
          if (!force && this.prevThumbData) {
            let diffSum = 0;
            for (let i = 0; i < imgData.length; i += 4) {
              diffSum += Math.abs(imgData[i] - this.prevThumbData[i]) +
                         Math.abs(imgData[i+1] - this.prevThumbData[i+1]) +
                         Math.abs(imgData[i+2] - this.prevThumbData[i+2]);
            }
            const avgDiff = diffSum / (16 * 9 * 3);
            // If the video frame hasn't visibly changed (stationary slide or paused), skip sending 80KB frame!
            if (avgDiff < 2.5) {
              return;
            }
          }
          this.prevThumbData = new Uint8Array(imgData);
        }
      }

      const ctx = this.canvasElement.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
      const base64Data = this.canvasElement.toDataURL('image/jpeg', 0.75);
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
      // Gather audio tracks from shared Chrome tab and any mic
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

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported in this browser.');
        return;
      }

      // Initialize AudioContext at 16kHz (native Whisper sample rate)
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      const actualSampleRate = this.audioContext.sampleRate || 16000;

      const combinedStream = new MediaStream(audioTracks);
      this.audioSourceNode = this.audioContext.createMediaStreamSource(combinedStream);

      // Buffer size 4096 gives ~250ms audio blocks at 16kHz
      const bufferSize = 4096;
      this.audioProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      // Silent gain node prevents audio loopback to speakers while keeping audio processor active
      this.silentGain = this.audioContext.createGain();
      this.silentGain.gain.value = 0.0;

      this.audioSourceNode.connect(this.audioProcessor);
      this.audioProcessor.connect(this.silentGain);
      this.silentGain.connect(this.audioContext.destination);

      let accumulatedSamples: number[] = [];
      let previousOverlap: number[] = [];
      // 2.5s target new audio (40,000 samples at 16kHz) for optimal Whisper phonetic context.
      // 0.35s sliding overlap handles boundary words cleanly without delay.
      const targetNewSamples = Math.round(actualSampleRate * 2.5);
      const overlapLength = Math.round(actualSampleRate * 0.35);

      this.audioProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.callbacks?.onAudioChunk) return;

        const inputChannel = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputChannel.length; i++) {
          accumulatedSamples.push(inputChannel[i]);
        }

        if (accumulatedSamples.length >= targetNewSamples) {
          const currentChunk = accumulatedSamples;
          accumulatedSamples = [];

          // Prepend previous overlap so words at chunk boundaries are never split
          const fullBuffer = previousOverlap.concat(currentChunk);
          previousOverlap = currentChunk.slice(-overlapLength);

          // Calculate RMS to discard silence and only process actual speech/sound
          let sumSquares = 0;
          for (let i = 0; i < fullBuffer.length; i++) {
            sumSquares += fullBuffer[i] * fullBuffer[i];
          }
          const rms = Math.sqrt(sumSquares / fullBuffer.length);

          // If client Web Speech API is already transcribing voice, avoid sending redundant audio to server
          const webSpeechIsActive = (Date.now() - this.lastWebSpeechTime) < 2500;

          if (rms > 0.004 && !webSpeechIsActive) {
            const timestampSec = (Date.now() - this.startTime) / 1000.0;
            const wavBase64 = this.encodeWAVBase64(fullBuffer, actualSampleRate);
            if (wavBase64 && this.callbacks?.onAudioChunk) {
              this.callbacks.onAudioChunk(wavBase64, timestampSec, 'Instructor');
            }
          }
        }
      };
    } catch (e) {
      console.warn('Audio streaming setup note:', e);
    }
  }

  private encodeWAVBase64(samples: number[], sampleRate: number): string {
    const numSamples = samples.length;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true);  // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // PCM 16-bit signed integer samples
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    // Convert to binary string in chunks to prevent stack overflow
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  private setupSpeechRecognition() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              finalTranscript += piece;
            } else {
              interimTranscript += piece;
            }
          }

          const timestampSec = (Date.now() - this.startTime) / 1000.0;

          // Emit interim transcript immediately so every single word is visible as spoken
          if (interimTranscript.trim() && this.callbacks?.onInterimTranscript) {
            this.callbacks.onInterimTranscript(interimTranscript.trim(), timestampSec, 'Speaker');
          }

          // Emit final transcript when phrase is completed
          if (finalTranscript.trim() && this.callbacks?.onTranscriptChunk) {
            this.lastWebSpeechTime = Date.now();
            this.callbacks.onTranscriptChunk(finalTranscript.trim(), timestampSec, 'Speaker');
          }
        };

        this.recognition.onerror = (e: any) => {
          if (e.error === 'no-speech') {
            return; // Normal pause in conversation
          }
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            this.speechDenied = true;
          }
          console.warn('Speech recognition status:', e.error);
        };

        this.recognition.onend = () => {
          if (this.recognitionRestartTimer) clearTimeout(this.recognitionRestartTimer);
          // Debounced restart (300ms) to allow Chrome's audio subsystem to clean up and prevent InvalidStateError
          if (!this.speechDenied && this.mediaStream && this.mediaStream.active) {
            this.recognitionRestartTimer = setTimeout(() => {
              try {
                if (this.mediaStream && this.mediaStream.active && this.recognition) {
                  this.recognition.start();
                }
              } catch (_) {}
            }, 300);
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
    if (this.recognitionRestartTimer) {
      clearTimeout(this.recognitionRestartTimer);
      this.recognitionRestartTimer = null;
    }
    this.prevThumbData = null;
    if (this.audioProcessor) {
      try {
        this.audioProcessor.disconnect();
        this.audioProcessor.onaudioprocess = null;
      } catch (_) {}
      this.audioProcessor = null;
    }
    if (this.audioSourceNode) {
      try { this.audioSourceNode.disconnect(); } catch (_) {}
      this.audioSourceNode = null;
    }
    if (this.micSourceNode) {
      try { this.micSourceNode.disconnect(); } catch (_) {}
      this.micSourceNode = null;
    }
    if (this.silentGain) {
      try { this.silentGain.disconnect(); } catch (_) {}
      this.silentGain = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
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

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }
}

export const mediaCaptureManager = new BrowserMediaCaptureManager();
