import React from "react";

/** Finite-state machine for every recorder implementation */
export type AudioRecorderState = "idle" | "recording" | "processing";

/** Error subclass so callers can `instanceof`-guard recorder failures */
export class AudioRecorderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioRecorderError";
  }
}

/**
 * The one true, generic contract.
 *
 * - `start()` resolves when the microphone is *actually* hot
 *   (e.g. permissions granted, buffers cleared, capturing).
 * - `stop()` resolves with the finished `Blob`.
 * - `state` is always the current FSM value.
 * - `dispose()` is optional but useful for React unmounts / test cleanup.
 */
export interface AudioRecorderControls {
  /** Observable state */
  readonly state: AudioRecorderState;

  /** Start capturing */
  start(): Promise<void>;

  /** Stop capturing and return the audio blob */
  stop(): Promise<Blob>;

  /** Clean up resources (optional) */
  dispose?(): void;
}

/**
 * The type every recorder React component must satisfy.
 *
 * ```
 * const MyRecorder: AudioRecorderComponent = forwardRef(...);
 * ```
 */
export type AudioRecorderComponent = React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> &
    React.RefAttributes<AudioRecorderControls>
>;
