declare module "kokoro-js" {
  export const KokoroTTS: {
    from_pretrained(
      modelId: string,
      options: { dtype: string },
    ): Promise<{
      generate(
        text: string,
        options?: { voice?: string },
      ): Promise<{ audio: Float32Array; sampling_rate: number }>
    }>
  }
}
