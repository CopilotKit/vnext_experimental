export enum RecordingState {
  IDLE = "idle",
  REQUESTING_PERMISSION = "requesting_permission",
  RECORDING = "recording",
  STOPPING = "stopping",
  COMPLETED = "completed",
  ERROR = "error",
  CANCELLED = "cancelled",
}

export class EnvironmentNotSupportedError extends Error {
  constructor(
    message = "Audio recording is not supported in this environment"
  ) {
    super(message);
    this.name = "EnvironmentNotSupportedError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(message = "Microphone permission was denied") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export class RecordingFailedError extends Error {
  constructor(message = "Audio recording failed") {
    super(message);
    this.name = "RecordingFailedError";
  }
}

export interface AudioRecorderConfig {
  onStateChange?: (state: RecordingState) => void;
  onError?: (error: Error) => void;
  onProgress?: (duration: number) => void;
  onRecordingComplete?: (audioBlob: Blob) => void;
  maxDuration?: number; // Maximum recording duration in milliseconds
  mimeType?: string; // Preferred audio MIME type
}

export interface AudioRecorderResult {
  audioBlob: Blob;
  duration: number;
  mimeType: string;
}

export class AudioRecorder {
  private state: RecordingState = RecordingState.IDLE;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private progressTimer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private config: Required<AudioRecorderConfig>;

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      onStateChange: config.onStateChange || (() => {}),
      onError: config.onError || (() => {}),
      onProgress: config.onProgress || (() => {}),
      onRecordingComplete: config.onRecordingComplete || (() => {}),
      maxDuration: config.maxDuration || 300000, // 5 minutes default
      mimeType: config.mimeType || "audio/webm;codecs=opus",
    };
  }

  /**
   * Check if audio recording is supported in the current environment
   */
  static isSupported(): boolean {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }

    // Check for required APIs
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      "MediaRecorder" in window
    );
  }

  /**
   * Get the current recording state
   */
  getState(): RecordingState {
    return this.state;
  }

  /**
   * Get the current audio stream for visualization (e.g., wavesurfer)
   */
  getAudioStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.state === RecordingState.RECORDING;
  }

  /**
   * Start audio recording
   */
  async startRecording(): Promise<void> {
    try {
      // Check environment compatibility
      this.checkEnvironment();

      // Check if already recording or in progress
      if (
        this.state !== RecordingState.IDLE &&
        this.state !== RecordingState.ERROR
      ) {
        throw new RecordingFailedError(
          "Recording is already in progress or completed"
        );
      }

      this.setState(RecordingState.REQUESTING_PERMISSION);
      this.abortController = new AbortController();

      // Request microphone permission and get media stream
      await this.setupMediaStream();

      // Setup media recorder
      this.setupMediaRecorder();

      // Start recording
      this.setState(RecordingState.RECORDING);
      this.mediaRecorder!.start(1000); // Collect data every second
      this.startTime = Date.now();
      this.startProgressTimer();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Stop recording and return the result
   */
  async stopRecording(): Promise<AudioRecorderResult> {
    return new Promise((resolve, reject) => {
      if (this.state !== RecordingState.RECORDING) {
        reject(new RecordingFailedError("No active recording to stop"));
        return;
      }

      this.setState(RecordingState.STOPPING);

      // Set up event handler for when recording stops
      const handleStop = () => {
        try {
          const duration = Date.now() - this.startTime;
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder!.mimeType,
          });

          const result: AudioRecorderResult = {
            audioBlob,
            duration,
            mimeType: this.mediaRecorder!.mimeType,
          };

          this.setState(RecordingState.COMPLETED);
          this.config.onRecordingComplete(audioBlob);
          this.cleanup();
          resolve(result);
        } catch (error) {
          this.handleError(error as Error);
          reject(error);
        }
      };

      // Stop the recording
      this.mediaRecorder!.addEventListener("stop", handleStop, { once: true });
      this.mediaRecorder!.stop();
      this.stopProgressTimer();
    });
  }

  /**
   * Cancel the current recording
   */
  cancelRecording(): void {
    if (
      this.state === RecordingState.IDLE ||
      this.state === RecordingState.CANCELLED
    ) {
      return;
    }

    this.setState(RecordingState.CANCELLED);

    // Stop media recorder if active
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
    }

    // Abort any pending operations
    if (this.abortController) {
      this.abortController.abort();
    }

    this.stopProgressTimer();
    this.cleanup();
  }

  /**
   * Get supported MIME types for audio recording
   */
  static getSupportedMimeTypes(): string[] {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
    ];

    if (!AudioRecorder.isSupported()) {
      return [];
    }

    return types.filter((type) => MediaRecorder.isTypeSupported(type));
  }

  private checkEnvironment(): void {
    if (!AudioRecorder.isSupported()) {
      throw new EnvironmentNotSupportedError(
        "Audio recording requires a browser environment with MediaRecorder and getUserMedia support"
      );
    }
  }

  private async setupMediaStream(): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
        video: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Check if operation was cancelled
      if (this.abortController?.signal.aborted) {
        this.cleanup();
        throw new RecordingFailedError("Recording was cancelled");
      }
    } catch (error: any) {
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        throw new PermissionDeniedError(
          "Microphone access was denied by the user"
        );
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        throw new RecordingFailedError("No microphone device found");
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        throw new RecordingFailedError(
          "Microphone is already in use by another application"
        );
      } else {
        throw new RecordingFailedError(
          `Failed to access microphone: ${error.message}`
        );
      }
    }
  }

  private setupMediaRecorder(): void {
    if (!this.mediaStream) {
      throw new RecordingFailedError("No media stream available");
    }

    // Try to use the preferred MIME type, fallback to supported types
    const supportedTypes = AudioRecorder.getSupportedMimeTypes();
    const mimeType = supportedTypes.includes(this.config.mimeType)
      ? this.config.mimeType
      : supportedTypes[0];

    if (!mimeType) {
      throw new RecordingFailedError("No supported audio format found");
    }

    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType,
      audioBitsPerSecond: 128000, // 128 kbps
    });

    // Clear previous chunks
    this.audioChunks = [];

    // Handle data available event
    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    });

    // Handle errors
    this.mediaRecorder.addEventListener("error", (event: any) => {
      this.handleError(
        new RecordingFailedError(
          `MediaRecorder error: ${event.error?.message || "Unknown error"}`
        )
      );
    });

    // Auto-stop at max duration
    setTimeout(() => {
      if (this.state === RecordingState.RECORDING) {
        this.stopRecording().catch((error) => this.handleError(error));
      }
    }, this.config.maxDuration);
  }

  private startProgressTimer(): void {
    this.progressTimer = setInterval(() => {
      if (this.state === RecordingState.RECORDING) {
        const duration = Date.now() - this.startTime;
        this.config.onProgress(duration);
      }
    }, 100); // Update every 100ms
  }

  private stopProgressTimer(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private setState(newState: RecordingState): void {
    this.state = newState;
    this.config.onStateChange(newState);
  }

  private handleError(error: Error): void {
    this.setState(RecordingState.ERROR);
    this.cleanup();
    this.config.onError(error);
  }

  private cleanup(): void {
    // Stop progress timer
    this.stopProgressTimer();

    // Stop and release media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Clear media recorder
    this.mediaRecorder = null;

    // Clear abort controller
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Don't clear audioChunks in case we need them for completed recording
    if (
      this.state === RecordingState.CANCELLED ||
      this.state === RecordingState.ERROR
    ) {
      this.audioChunks = [];
    }
  }
}
