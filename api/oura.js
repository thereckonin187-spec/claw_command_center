const ENDPOINT_MAP = {
  sleep: "daily_sleep",
  readiness: "daily_readiness",
  activity: "daily_activity",
  heartrate: "heartrate",
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { endpoint, ...params } = req.query;

  if (!endpoint || !ENDPOINT_MAP[endpoint]) {
    return res.status(400).json({ error: `Invalid endpoint. Use: ${Object.keys(ENDPOINT_MAP).join(", ")}` });
  }

  const token = process.env.OURA_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "OURA_TOKEN not configured" });
  }

  const ouraPath = ENDPOINT_MAP[endpoint];
  const queryString = new URLSearchParams(params).toString();
  const url = `https://api.ouraring.com/v2/usercollection/${ouraPath}${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Failed to reach Oura API" });
  }
}
