// Shaan Fitness lucky draw — shared settings
window.DN = {
  SB_URL: "https://izdsqmghkawvdvcolajv.supabase.co",
  SB_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6ZHNxbWdoa2F3dmR2Y29sYWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzQ4OTMsImV4cCI6MjEwMjY1MDg5M30.3l46wtCn9sv4huDZqCptOZ5CHW7u-Cl-cgEtpWtn2V8",
  SITE: "https://shaanfitness.github.io/luckydraw/",
  // Shaan Fitness WhatsApp number (entrants send their ID here; it stays in their chat as proof)
  SF_WHATSAPP: "919502318090",
  PRIZE: {
    couple: { title: "₹29,000 Couple Edition", short: "Couple Edition", amt: "₹29,000", voucher: "SF-AP26-COUPLE-001", img: "assets/couple-front.jpg",
      detail: "1 month Elite Personal Coaching for the couple + 6 months gym membership each" },
    single: { title: "₹24,000 Duo Edition", short: "Duo Edition", amt: "₹24,000", voucher: "SF-AP26-DUO-001", img: "assets/duo-front.jpg",
      detail: "1 month Elite Personal Coaching for two + 3 months gym membership each" },
  },
};
DN.rest = async (path) => {
  const r = await fetch(DN.SB_URL + "/rest/v1/" + path, { headers: { apikey: DN.SB_KEY, Authorization: "Bearer " + DN.SB_KEY } });
  return r.json();
};
DN.fn = async (name, body) => {
  try { return await DN._fn(name, body); } catch (_) { return { ok: false, message: "No internet connection. Please check your network and try again." }; }
};
DN._fn = async (name, body) => {
  const r = await fetch(DN.SB_URL + "/functions/v1/" + name, { method: "POST",
    headers: { "Content-Type": "application/json", apikey: DN.SB_KEY, Authorization: "Bearer " + DN.SB_KEY }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ ok: false, message: "Network error. Please try again." }));
};
DN.rpc = async (name, args) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await DN._rpc(name, args); } catch (_) { await new Promise(r => setTimeout(r, 800)); }
  }
  return { ok: false, message: "No internet connection. Please check your network and try again." };
};
DN._rpc = async (name, args) => {
  const r = await fetch(DN.SB_URL + "/rest/v1/rpc/" + name, { method: "POST",
    headers: { "Content-Type": "application/json", apikey: DN.SB_KEY, Authorization: "Bearer " + DN.SB_KEY }, body: JSON.stringify(args) });
  const j = await r.json().catch(() => null);
  if (!r.ok) return { ok: false, message: (j && j.message) || "Request failed." };
  return j;
};
DN.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
