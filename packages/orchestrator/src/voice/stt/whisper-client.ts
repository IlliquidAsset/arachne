const DEFAULT_TIMEOUT_MS = 10_000

export async function transcribe(
  audioBuffer: Buffer,
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const formData = new FormData()
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/wav" }),
    "audio.wav",
  )

  let response: Response

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    response = await fetchFn(`${url}/inference`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeout)
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Whisper transcription timed out after ${DEFAULT_TIMEOUT_MS}ms`,
      )
    }
    throw new Error(
      `Whisper transcription failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!response.ok) {
    throw new Error(
      `Whisper transcription failed with status ${response.status}: ${await response.text()}`,
    )
  }

  const data = (await response.json()) as { text: string }
  return data.text.trim()
}
