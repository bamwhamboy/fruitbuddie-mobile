export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Voice transcription is not configured yet. Add SARVAM_API_KEY to the Vercel project environment variables."
    });
  }

  const { audio_base64, mime_type = "audio/webm" } = req.body || {};
  if (typeof audio_base64 !== "string" || !audio_base64) {
    return res.status(400).json({ error: "No audio recording was received." });
  }

  const audio = Buffer.from(audio_base64, "base64");
  if (!audio.length) return res.status(400).json({ error: "The audio recording was empty." });
  if (audio.length > 15 * 1024 * 1024) {
    return res.status(413).json({ error: "Recording is too large. Please keep it under 25 seconds." });
  }

  const safeMime = /^audio\/[a-z0-9.+-]+$/i.test(mime_type) ? mime_type : "audio/webm";
  const extension = safeMime.includes("mp4") ? "m4a" : safeMime.includes("ogg") ? "ogg" : safeMime.includes("wav") ? "wav" : "webm";
  const form = new FormData();
  form.append("file", new Blob([audio], { type: safeMime }), `fruitbuddie-question.${extension}`);
  form.append("model", "saaras:v4");
  form.append("mode", "transcribe");
  form.append("language_code", "unknown");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const upstream = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: form,
      signal: controller.signal
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: payload.error?.message || payload.message || "Sarvam could not transcribe this recording. Please try again."
      });
    }
    return res.status(200).json({
      transcript: payload.transcript || "",
      language_code: payload.language_code || null,
      language_probability: payload.language_probability ?? null
    });
  } catch (error) {
    const message = error.name === "AbortError"
      ? "Speech transcription timed out. Please try again."
      : "Could not connect to the speech transcription service.";
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
