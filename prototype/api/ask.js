export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: "Backend is not configured yet." });
  }

  const { query, language = "en-IN", health_conditions = [], goal = "General fruit guidance" } = req.body || {};
  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Please enter a question." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query: query.trim(), language, health_conditions: Array.isArray(health_conditions) ? health_conditions : [], goal }),
      signal: controller.signal
    });
    const body = await upstream.text();
    let data;
    try { data = JSON.parse(body); } catch { data = body; }
    res.setHeader("Cache-Control", "no-store");
    return res.status(upstream.status).json(
      typeof data === "string" ? { response: data } : data
    );
  } catch (error) {
    const message = error.name === "AbortError"
      ? "FruitBuddie took too long to respond. Please try again."
      : "Could not reach the FruitBuddie backend. Check that n8n and ngrok are running.";
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
