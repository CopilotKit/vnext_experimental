export abstract class TranscribeAdapter {
  abstract transcribeFile(audioFile: File): Promise<string>;
}
