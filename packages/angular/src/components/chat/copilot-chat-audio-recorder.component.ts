import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
  ViewEncapsulation
} from '@angular/core';
import { AudioRecorderState, AudioRecorderError } from './copilot-chat-input.types';

@Component({
  selector: 'copilot-chat-audio-recorder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="computedClass()">
      <canvas
        #canvasRef
        width="300"
        height="100"
        class="audio-waveform"
      ></canvas>
      @if (showControls()) {
        <div class="controls">
          <span class="status">{{ statusText() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      padding: 1.25rem;
    }
    
    .audio-recorder-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    
    .audio-waveform {
      width: 100%;
      height: 100px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.05);
    }
    
    :host-context(.dark) .audio-waveform {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
    }
    
    :host-context(.dark) .controls {
      color: rgba(255, 255, 255, 0.6);
    }
    
    .status {
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `],
  host: {
    '[class.copilot-chat-audio-recorder]': 'true'
  }
})
export class CopilotChatAudioRecorderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  @Input() set inputShowControls(val: boolean | undefined) {
    this.showControls.set(val ?? false);
  }
  
  @Output() stateChange = new EventEmitter<AudioRecorderState>();
  @Output() error = new EventEmitter<AudioRecorderError>();
  
  // Signals for state management
  state = signal<AudioRecorderState>('idle');
  customClass = signal<string | undefined>(undefined);
  showControls = signal<boolean>(false);
  
  // Computed values
  computedClass = computed(() => {
    const baseClasses = 'audio-recorder-container';
    return this.customClass() || baseClasses;
  });
  
  statusText = computed(() => {
    switch (this.state()) {
      case 'recording':
        return 'Recording...';
      case 'processing':
        return 'Processing...';
      default:
        return 'Ready';
    }
  });
  
  // Animation and canvas properties
  private animationFrameId?: number;
  private canvasContext?: CanvasRenderingContext2D | null;
  private isAnimating = false;
  
  ngAfterViewInit(): void {
    this.initializeCanvas();
  }
  
  ngOnDestroy(): void {
    this.stopAnimation();
  }
  
  /**
   * Start recording audio
   */
  async start(): Promise<void> {
    try {
      if (this.state() === 'recording') {
        return;
      }
      
      this.setState('recording');
      this.startAnimation();
      
      // In a real implementation, this would start actual audio recording
      // For now, we just simulate the recording state
      
    } catch (err) {
      const error = new AudioRecorderError(
        err instanceof Error ? err.message : 'Failed to start recording'
      );
      this.error.emit(error);
      this.setState('idle');
      throw error;
    }
  }
  
  /**
   * Stop recording audio
   */
  async stop(): Promise<void> {
    try {
      if (this.state() !== 'recording') {
        return;
      }
      
      this.setState('processing');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.setState('idle');
      this.stopAnimation();
      
    } catch (err) {
      const error = new AudioRecorderError(
        err instanceof Error ? err.message : 'Failed to stop recording'
      );
      this.error.emit(error);
      this.setState('idle');
      throw error;
    }
  }
  
  /**
   * Get current recorder state
   */
  getState(): AudioRecorderState {
    return this.state();
  }
  
  private setState(state: AudioRecorderState): void {
    this.state.set(state);
    this.stateChange.emit(state);
  }
  
  private initializeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    
    try {
      this.canvasContext = canvas.getContext('2d');
      
      if (this.canvasContext) {
        // Set initial canvas properties
        this.canvasContext.strokeStyle = '#4F46E5'; // Indigo color
        this.canvasContext.lineWidth = 2;
        this.canvasContext.lineCap = 'round';
        
        // Draw initial flat line
        this.drawWaveform(new Array(50).fill(0.5));
      }
    } catch {
      // Canvas not supported in test environment
      console.debug('Canvas initialization skipped (likely in test environment)');
    }
  }
  
  private startAnimation(): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.animate();
  }
  
  private stopAnimation(): void {
    this.isAnimating = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    
    // Draw flat line when stopped
    if (this.canvasContext) {
      this.drawWaveform(new Array(50).fill(0.5));
    }
  }
  
  private animate(): void {
    if (!this.isAnimating) return;
    
    const samples = this.generateWaveform(50);
    this.drawWaveform(samples);
    
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
  
  private generateWaveform(sampleCount: number): number[] {
    const elapsed = Date.now() / 1000;
    const samples: number[] = [];
    
    for (let i = 0; i < sampleCount; i++) {
      // Create a position that moves from left to right over time
      const position = (i / sampleCount) * 10 + elapsed * 0.5;
      
      // Generate waveform using multiple sine waves for realism
      const wave1 = Math.sin(position * 2) * 0.3;
      const wave2 = Math.sin(position * 5 + elapsed) * 0.2;
      const wave3 = Math.sin(position * 0.5 + elapsed * 0.3) * 0.4;
      
      // Add some randomness for natural variation
      const noise = (Math.random() - 0.5) * 0.1;
      
      // Combine waves and add envelope for realistic amplitude variation
      const envelope = Math.sin(elapsed * 0.7) * 0.5 + 0.5;
      let amplitude = (wave1 + wave2 + wave3 + noise) * envelope;
      
      // Clamp to 0-1 range
      amplitude = Math.max(0, Math.min(1, amplitude * 0.5 + 0.5));
      
      samples.push(amplitude);
    }
    
    return samples;
  }
  
  private drawWaveform(samples: number[]): void {
    if (!this.canvasContext) return;
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.canvasContext;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set style based on state
    if (this.state() === 'recording') {
      ctx.strokeStyle = '#EF4444'; // Red when recording
    } else if (this.state() === 'processing') {
      ctx.strokeStyle = '#F59E0B'; // Amber when processing
    } else {
      ctx.strokeStyle = '#4F46E5'; // Indigo when idle
    }
    
    // Draw waveform
    ctx.beginPath();
    
    samples.forEach((sample, index) => {
      const x = (index / (samples.length - 1)) * width;
      const y = height / 2 + (sample - 0.5) * height * 0.8;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Add glow effect when recording
    if (this.state() === 'recording') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.strokeStyle as string;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}