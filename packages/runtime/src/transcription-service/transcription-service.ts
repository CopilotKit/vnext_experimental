export abstract class TranscriptionService {
  abstract transcribeFile(audioFile: File): Promise<string>;
}
