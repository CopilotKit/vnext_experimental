import { TranscribeAdapter } from "./transcribe-adapter";
import OpenAI from "openai";

export interface TranscribeAdapterOpenAIConfig {
  openai: OpenAI;
  model?: string;
}

export class TranscribeAdapterOpenAI extends TranscribeAdapter {
  private openai: OpenAI;
  private model: string;

  constructor(config: TranscribeAdapterOpenAIConfig) {
    super();
    this.openai = config.openai ?? new OpenAI();
    this.model = config.model ?? "whisper-1";
  }

  async transcribeFile(audioFile: File): Promise<string> {
    const response = await this.openai.audio.transcriptions.create({
      file: audioFile,
      model: this.model,
    });
    return response.text;
  }
}
