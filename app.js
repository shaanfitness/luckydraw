/* Shaan Fitness × AuraPeak Dandiya Nights 2K26 — Lucky Draw app
   One page for everyone: guests apply, applicants watch, Ram shuffles & draws, Sabir manages. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app"), esc = DN.esc;
const AUTH = "dn26_auth";
const GOALS = ["Fat Loss","Weight Loss","Weight Gain","Muscle Gain","Strength","General Fitness","PCOS / PCOD","Thyroid","Diabetes","Others"];
const ORNAMENT = `<svg class="ornament" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#c9a54e" stroke-width="2">
  ${[0,22.5,45,67.5,90,112.5,135,157.5].map(a => `<ellipse cx="50" cy="50" rx="10" ry="38" transform="rotate(${a} 50 50)"/>`).join("")}
  <circle cx="50" cy="50" r="9" fill="#c9a54e"/></g></svg>`;

let auth = load(AUTH), st = null, me = null, adm = { entries: [], draws: [] }, tab = "live", cat = null;
const seen = new Set(load("dn26_seen") || []);
function load(k){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } }
function save(k, v){ try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
const markSeen = (id) => { seen.add(id); save("dn26_seen", [...seen]); };
const role = () => (auth && auth.role) || "guest";
const P = (c) => DN.PRIZE[c];
function toast(t){ const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 3200); }

/* ---------------- pop-up sheet ---------------- */
function openSheet(html, { dismissable = true } = {}){
  $("#sheet").innerHTML = (dismissable ? `<button class="x" data-close aria-label="Close">×</button>` : "") + html;
  $("#modal").classList.add("on"); document.body.style.overflow = "hidden";
}
function closeSheet(){ $("#modal").classList.remove("on"); document.body.style.overflow = ""; }
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal" || e.target.closest("[data-close]")) closeSheet(); });

/* ---------------- top bar ---------------- */
function paintAcct(){
  const r = role();
  $("#acct").innerHTML = r === "guest"
    ? `<button class="tbtn" id="loginBtn">Log In</button>`
    : `<div class="who"><span class="nm"><b>${esc(auth.name)}</b>${r === "owner" ? "Admin" : r === "drawer" ? "Draw control" : "Applicant"}</span><button class="tbtn" id="logoutBtn">Log out</button></div>`;
  $("#loginBtn") && ($("#loginBtn").onclick = loginSheet);
  $("#logoutBtn") && ($("#logoutBtn").onclick = () => { if (confirm("Log out from this phone?")) { auth = null; save(AUTH, null); me = null; route(); } });
}

function loginSheet(){
  openSheet(`<h2>Log In</h2>
    <p class="lead" style="margin-top:8px">Applicants: use your mobile number and your <b>Lucky Draw ID</b> (for example DN26-C012).</p>
    <form id="lf" style="margin-top:16px">
      <label class="f" for="lm">Mobile number</label>
      <div class="phone"><span>+91</span><input type="tel" id="lm" inputmode="numeric" maxlength="14" autocomplete="username" placeholder="10-digit number"></div>
      <label class="f" for="lp">Lucky Draw ID / Password</label>
      <input type="password" id="lp" autocomplete="current-password" placeholder="DN26-…">
      <p class="err" id="lerr"></p>
      <button class="btn" style="margin-top:14px">Log In</button>
    </form>`);
  $("#lm").focus();
  $("#lf").onsubmit = async (e) => {
    e.preventDefault(); $("#lerr").textContent = "";
    const b = $("#lf button"); b.disabled = true; b.textContent = "Checking…";
    const r = await DN.rpc("dn_login", { p_phone: $("#lm").value, p_secret: $("#lp").value.trim() });
    b.disabled = false; b.textContent = "Log In";
    if (!r || !r.ok) { $("#lerr").textContent = (r && r.message) || "Couldn't log in. Please try again."; return; }
    auth = { role: r.role, name: r.name, token: r.token }; save(AUTH, auth);
    closeSheet(); route(); toast(`Welcome, ${r.name}!`);
  };
}

/* ---------------- routing ---------------- */
async function route(){
  paintAcct();
  const r = role();
  if (r === "applicant") {
    const m = await DN.rpc("dn_me", { p_token: auth.token });
    if (!m || !m.ok) { auth = null; save(AUTH, null); return route(); }
    me = m; return viewApplicant();
  }
  if (r === "owner" || r === "drawer") {
    const ok = await DN.rpc("dn_admin_login", { p_pin: auth.token });
    if (!ok || !ok.ok) { auth = null; save(AUTH, null); toast("Please log in again."); return route(); }
    await loadAdm();
    return r === "owner" ? viewAdmin() : viewRam();
  }
  viewHome();
  if (/\/admin\/?$/.test(location.pathname) || location.hash === "#admin") loginSheet();
  if (/\/live\/?$/.test(location.pathname) || location.hash === "#live") setTimeout(() => $("#liveBox") && $("#liveBox").scrollIntoView({ behavior: "smooth" }), 400);
}

/* ---------------- guest home ---------------- */
function viewHome(){
  const open = !st || st.registration_open;
  app.innerHTML = `
    <p class="sponsor" style="margin-top:4px">One of the proud sponsors · AuraPeak Dandiya Nights 2K26</p>
    <div class="rule">✦</div>
    <h1 class="title">Two Exclusive Fitness Prizes</h1>
    <div class="big">₹53,000</div>
    <p class="sub">Combined value · Lucky draw</p>
    <div class="cards">
      <div><img src="assets/couple-front.jpg" alt="₹29,000 Couple Edition voucher"><p class="cap">Couple Edition · ₹29,000</p></div>
      <div><img src="assets/duo-front.jpg" alt="₹24,000 Duo Edition voucher"><p class="cap">Duo Edition · ₹24,000</p></div>
    </div>
    <p class="event">Sun 18 Oct 2026 · 6 PM · Halcyon Times Club · Kakinada</p>
    <div class="hero-cta">${open
      ? `<button class="btn" id="applyBtn">Apply for Lucky Draw</button>
         <p class="note">Free for event attendees · One entry per mobile number &amp; email · Takes 1 minute</p>`
      : `<div class="panel" style="text-align:center"><h3>Applications are closed</h3><p class="muted">Thank you for the amazing response! Watch the draw live below.</p></div>`}
      <p class="note" style="margin-top:10px">Already applied? <a href="#" id="alreadyBtn">Log In</a> with your mobile number and Lucky Draw ID.</p>
    </div>
    <div class="rule" style="margin-top:28px">Live draw</div>
    <div id="liveBox"></div>
    <footer>Shaan Fitness · Your Trusted Health Partner · Kakinada<br>Prizes are fitness-service vouchers, not cash. Free to enter; winners are picked at random, live.</footer>`;
  $("#applyBtn") && ($("#applyBtn").onclick = chooseSheet);
  $("#alreadyBtn").onclick = (e) => { e.preventDefault(); loginSheet(); };
  Live.mount($("#liveBox"));
}

function chooseSheet(){
  openSheet(`<h2>Apply for Lucky Draw</h2><p class="lead" style="margin-top:6px">How are you attending?</p>
    <div class="choose" style="margin-top:16px">
      <button class="opt" data-cat="couple"><span class="ic">♥</span><span><b>Couples</b><span>Apply together. One couple wins the Couple Edition.</span></span><span class="amt">₹29K</span></button>
      <button class="opt" data-cat="single"><span class="ic">★</span><span><b>Singles</b><span>One male &amp; one female are drawn together for the Duo Edition.</span></span><span class="amt">₹24K</span></button>
    </div>`);
  $$("#sheet .opt").forEach(b => b.onclick = () => { cat = b.dataset.cat; closeSheet(); viewForm(); });
}

/* ---------------- application form ---------------- */
function person(pre, heading){
  return `<h3>${heading}</h3>
  <label class="f" for="${pre}name">Full name</label>
  <input type="text" id="${pre}name" maxlength="60" placeholder="As you'd like it announced" autocomplete="${pre ? "off" : "name"}">
  <label class="f">Gender</label>
  <div class="seg" data-seg="${pre}gender"><button type="button" data-v="male" aria-pressed="false">Male</button><button type="button" data-v="female" aria-pressed="false">Female</button></div>
  <label class="f" for="${pre}phone">WhatsApp / mobile number</label>
  <div class="phone"><span>+91</span><input type="tel" id="${pre}phone" inputmode="numeric" maxlength="14" placeholder="10-digit number" autocomplete="${pre ? "off" : "tel-national"}"></div>
  <label class="f" for="${pre}email">Email</label>
  <input type="email" id="${pre}email" inputmode="email" maxlength="120" placeholder="you@example.com" autocomplete="${pre ? "off" : "email"}">
  <label class="f">Why do you want to train? <span style="opacity:.7">(choose any)</span></label>
  <div class="chips" data-chips="${pre}goals">${GOALS.map(g => `<button type="button" class="chip" aria-pressed="false" data-v="${g}">${g}</button>`).join("")}</div>
  <input type="text" id="${pre}other" class="hide" maxlength="120" placeholder="Tell us your goal" style="margin-top:10px">`;
}
function viewForm(){
  app.innerHTML = `
    <button class="back" id="backBtn">← Back</button>
    <h1 class="title">${cat === "couple" ? "Couples Application" : "Singles Application"}</h1>
    <p class="sub" style="margin-top:8px">${P(cat).title}</p>
    <form id="f" novalidate style="margin-top:18px">
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="panel">${person("", "Your details")}</div>
      ${cat === "couple" ? `<div class="panel">${person("p_", "Your partner's details")}</div>` : ""}
      <div class="panel"><label class="check"><input type="checkbox" id="consent"> <span>I agree that Shaan Fitness may contact me by phone, WhatsApp or email about my entry and fitness programs. My mobile number and email are never shown publicly.</span></label></div>
      <p class="err" id="err" role="alert"></p>
      <button class="btn" id="submitBtn" type="submit" style="margin-top:12px">Submit Application</button>
      <p class="note">Each mobile number and email can be used only once — in Couples or Singles, not both.</p>
    </form>`;
  window.scrollTo(0, 0);
  $("#backBtn").onclick = () => viewHome();
  $("#f").onsubmit = submitForm;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".seg button");
  if (b) { b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); return; }
  const c = e.target.closest(".chip");
  if (c) { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") !== "true");
    const box = c.parentElement, pre = box.dataset.chips.replace("goals", "");
    $("#" + pre + "other").classList.toggle("hide", box.querySelector('[data-v="Others"]').getAttribute("aria-pressed") !== "true"); }
});
document.addEventListener("input", (e) => { if (e.target.matches('input[type=tel]')) { const v = e.target.value.replace(/[^\d+ ]/g, ""); if (v !== e.target.value) e.target.value = v; } });
const digits = (v) => { let d = String(v).replace(/\D/g, ""); if (d.length === 12 && d.startsWith("91")) d = d.slice(2); if (d.length === 11 && d.startsWith("0")) d = d.slice(1); return d; };
function collect(pre, who){
  const v = (id) => $("#" + pre + id).value.trim();
  const g = $(`[data-seg="${pre}gender"] [aria-pressed="true"]`), goals = $$(`[data-chips="${pre}goals"] [aria-pressed="true"]`).map(x => x.dataset.v);
  const o = { name: v("name"), gender: g ? g.dataset.v : "", phone: digits(v("phone")), email: v("email").toLowerCase(), goals, other: v("other") };
  if (o.name.length < 2) throw `Please enter ${who} full name.`;
  if (!o.gender) throw `Please choose ${who} gender.`;
  if (!/^[6-9]\d{9}$/.test(o.phone)) throw `Please enter ${who} 10-digit mobile number.`;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) throw `Please enter ${who} email address.`;
  if (!goals.length) throw `Please choose at least one fitness goal for ${who === "your" ? "you" : "your partner"}.`;
  return o;
}
async function submitForm(e){
  e.preventDefault();
  const err = $("#err"); err.textContent = "";
  let body;
  try {
    const a = collect("", "your");
    body = { category: cat, name: a.name, gender: a.gender, phone: a.phone, email: a.email, goals: a.goals, goal_other: a.other, website: $("#f").website.value, consent: true };
    if (cat === "couple") {
      const b = collect("p_", "your partner's");
      if (b.phone === a.phone) throw "You and your partner need different mobile numbers.";
      if (b.email === a.email) throw "You and your partner need different email addresses.";
      Object.assign(body, { partner_name: b.name, partner_gender: b.gender, partner_phone: b.phone, partner_email: b.email, partner_goals: b.goals, partner_goal_other: b.other });
    }
    if (!$("#consent").checked) throw "Please tick the consent box to apply.";
  } catch (m) { err.textContent = m; err.scrollIntoView({ block: "center" }); return; }
  const btn = $("#submitBtn"); btn.disabled = true; btn.textContent = "Submitting…";
  const r = await DN.fn("dn-register", body);
  btn.disabled = false; btn.textContent = "Submit Application";
  if (!r.ok) { err.textContent = r.message || "Something went wrong. Please try again."; err.scrollIntoView({ block: "center" }); return; }
  // applicant is logged in automatically on this phone
  auth = { role: "applicant", name: r.name, token: `A|${body.phone}|${r.code}` }; save(AUTH, auth);
  await route();
  successSheet(r.code, body.phone);
}
function waIdLink(){
  const msg = `Hi Shaan Fitness! 🎉\nI've applied for the Dandiya Nights 2K26 lucky draw.\n\nName: ${me.entry_name}\nLucky Draw ID: ${me.code}\nCategory: ${me.category === "couple" ? "Couples" : "Singles"} (${P(me.category).title})\n\nWatch live: ${DN.SITE}`;
  return `https://wa.me/${DN.SF_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}
function successSheet(code, phone){
  openSheet(`<h2>Application successful! 🎉</h2>
    <div class="idcard" style="margin-top:16px"><div class="lbl">Your Lucky Draw ID</div><div class="code">${esc(code)}</div><div class="nm">${esc(me.entry_name)}</div></div>
    <p class="lead" style="margin-top:14px">You're logged in on this phone. To log in on another phone, use <b>+91 ${esc(phone)}</b> and your Lucky Draw ID.</p>
    <p class="lead">We've emailed your ID too. When the draw starts, a pop-up will appear here — keep this page open at the event.</p>
    <div class="stack"><a class="btn wa" href="${waIdLink()}" target="_blank" rel="noopener">Save my ID on WhatsApp</a><button class="btn ghost" data-close>Done</button></div>`);
}

/* ---------------- applicant home ---------------- */
function viewApplicant(){
  const won = me.won;
  app.innerHTML = `
    ${won ? `<div class="wcard" style="text-align:center;border-color:#7fe0a0"><div class="youwon">YOU WON</div><div class="nm" style="margin-top:6px">${esc(P(won.category).title)}</div>
      <p class="muted" style="margin-top:6px">Congratulations! Please come to the stage. The physical voucher handed over by the AuraPeak organiser is the only valid voucher.</p></div>` : ""}
    <div class="idcard" style="margin-top:12px">
      <div class="lbl">Your Lucky Draw ID</div><div class="code">${esc(me.code)}</div><div class="nm">${esc(me.entry_name)}</div>
      <div class="cap" style="margin-top:8px">${esc(P(me.category).title)} draw</div>
    </div>
    <div class="stack"><a class="btn wa" href="${waIdLink()}" target="_blank" rel="noopener">Save my ID on WhatsApp</a></div>
    <div class="rule" style="margin-top:26px">Live draw</div>
    <div id="liveBox"></div>
    <footer>Only winners' names and Lucky Draw IDs are shown. Your phone number and email are never shown.<br>Shaan Fitness · Kakinada</footer>`;
  Live.mount($("#liveBox"));
}

/* ---------------- Ram: Shuffle → Draw ---------------- */
const doneCat = (c) => (adm.draws || []).some(d => d.category === c && d.status === "final");
function viewRam(){
  app.innerHTML = `
    <p class="sponsor" style="margin-top:4px">Draw control · Ram Krishna · AuraPeak</p>
    <div id="liveBox"></div>
    <div class="control" id="ctrl"></div>`;
  Live.mount($("#liveBox")); paintRamCtrl();
}
function nextStep(){
  if (!st) return { kind: "wait", text: "Connecting…" };
  if (st.phase === "spinning") return { kind: "draw", c: st.category };
  if (st.registration_open) return { kind: "wait", text: "Waiting for Sabir to close applications" };
  if (st.phase === "revealed") return (doneCat("couple") && doneCat("single")) ? { kind: "done" } : { kind: "next" };
  if (!doneCat("couple")) return { kind: "shuffle", c: "couple" };
  if (!doneCat("single")) return { kind: "shuffle", c: "single" };
  return { kind: "done" };
}
function ctrlHTML(){
  const s = nextStep(), label = (c) => c === "couple" ? "Couples · ₹29,000" : "Singles Duo · ₹24,000";
  if (s.kind === "wait") return `<div class="step">Please wait</div><button class="btn huge shuffle" disabled>${esc(s.text)}</button>`;
  if (s.kind === "done") return `<div class="step">All draws complete · Alhamdulillah</div><button class="btn huge shuffle" disabled>✓ Both winners announced</button>`;
  if (s.kind === "next" && Live.landing) return `<div class="step">Drawing the chit…</div><button class="btn huge shuffle" disabled>Please wait</button>`;
  if (s.kind === "next") return `<div class="step">Winners are on everyone's screen</div><button class="btn huge" data-act="next">Next Draw →</button>`;
  if (s.kind === "shuffle") return `<div class="step">Step 1 of 2 · ${label(s.c)}</div><button class="btn huge shuffle" data-act="shuffle" data-c="${s.c}">Shuffle</button>`;
  return `<div class="step">Step 2 of 2 · ${label(s.c)}</div><button class="btn huge" data-act="draw">Draw</button>`;
}
function paintRamCtrl(){ const c = $("#ctrl"); if (c) c.innerHTML = ctrlHTML(); }
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  b.disabled = true;
  if (b.dataset.act === "shuffle") {
    const r = await DN.rpc("dn_shuffle", { p_pin: auth.token, p_category: b.dataset.c });
    if (!r.ok) { toast(r.message); b.disabled = false; } else await pollState();
  } else if (b.dataset.act === "next") {
    const r = await DN.rpc("dn_next_draw", { p_pin: auth.token });
    if (!r.ok) { toast(r.message); b.disabled = false; } else await pollState();
  } else if (b.dataset.act === "draw") {
    const r = await DN.rpc("dn_draw", { p_pin: auth.token });
    if (!r.ok) { toast(r.message); b.disabled = false; return; }
    DN.fn("dn-notify", { pin: auth.token, draw_id: r.draw_id });   // winners get their email automatically
    await loadAdm(); await pollState();
  }
});

/* ---------------- Sabir: admin ---------------- */
async function loadAdm(){ const r = await DN.rpc("dn_admin_entries", { p_pin: auth.token }); if (r && r.ok) adm = r; }
function viewAdmin(){
  app.innerHTML = `
    <div class="tabs" role="tablist">
      <button role="tab" data-tab="live" aria-selected="${tab === "live"}">Live</button>
      <button role="tab" data-tab="people" aria-selected="${tab === "people"}">Applicants</button>
      <button role="tab" data-tab="settings" aria-selected="${tab === "settings"}">Settings</button>
    </div>
    <div id="tabBody"></div>`;
  $$(".tabs button").forEach(b => b.onclick = () => { tab = b.dataset.tab; viewAdmin(); });
  const body = $("#tabBody");
  if (tab === "live") {
    body.innerHTML = `
      <div class="panel" id="regPanel"></div>
      <div id="liveBox" style="margin-top:6px"></div>
      <div class="panel" style="margin-top:16px"><h3>Winners</h3><div id="winList"></div></div>`;
    paintReg(); Live.mount($("#liveBox")); paintWinners();
  } else if (tab === "people") {
    body.innerHTML = `
      <div class="stats4" id="adStats"></div>
      <div class="panel" style="margin-top:12px"><h3>Why they want to train</h3><div class="bars" id="goalBars"></div></div>
      <div class="panel"><div class="row" style="align-items:center"><h3 style="margin:0">All applicants</h3>
        <button class="btn sm ghost" id="csvBtn" style="flex:none">Download CSV (for YDL)</button></div>
        <input type="search" id="q" placeholder="Search name, ID, phone, email or goal" style="margin-top:12px">
        <div class="tbl"><table><thead><tr><th>ID</th><th>Name</th><th>Mobile</th><th>Email</th><th>Goals</th><th>Applied</th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
    paintPeople(); $("#q").oninput = paintRows; $("#csvBtn").onclick = csv;
  } else {
    body.innerHTML = `
      <div class="panel"><h3>Backup draw control</h3><p class="muted">Ram Krishna runs the draw from his phone. Use this only if his phone has a problem.</p><div id="ctrl" style="margin-top:12px"></div></div>
      <div class="panel"><h3>Live screen</h3><div class="stack"><button class="btn ghost" id="clearBtn">Clear winners from everyone's screen</button></div></div>
      <div class="panel"><h3>Testing &amp; reset</h3><p class="muted">Nothing is ever deleted — old data is archived and hidden.</p>
        <div class="stack"><button class="btn ghost" id="resetDraws">Reset draw results only (keep applicants)</button>
        <button class="btn red" id="resetAll">GO LIVE: clear all test applicants &amp; results, re-open applications</button></div></div>
      <div class="panel"><h3>Logins</h3><p class="muted">Sabir (Admin) · +91 9502318090<br>Ram Krishna (Shuffle &amp; Draw only) · +91 9912130409<br>Applicants log in with their mobile number + Lucky Draw ID.</p></div>`;
    paintRamCtrl();
    $("#clearBtn").onclick = async () => { const r = await DN.rpc("dn_admin_show", { p_pin: auth.token, p_draw: null }); toast(r.ok ? "Live screen cleared." : r.message); pollState(); };
    $("#resetDraws").onclick = () => reset("draws");
    $("#resetAll").onclick = () => reset("all");
  }
}
function paintReg(){
  const el = $("#regPanel"); if (!el || !st) return;
  const people = st.couples * 2 + st.singles_male + st.singles_female;
  el.innerHTML = `<div class="row" style="align-items:center"><h3 style="margin:0">Applications</h3><span style="flex:none">${st.registration_open ? '<span class="pill on">Open</span>' : '<span class="pill off">Closed</span>'}</span></div>
    <p class="muted" style="margin-top:8px"><b style="color:var(--ivory)">${people}</b> people · ${st.couples} couples · ${st.singles_male} single men · ${st.singles_female} single women</p>
    <div class="stack"><button class="btn ${st.registration_open ? "red" : "ghost"}" id="regBtn">${st.registration_open ? "Close applications (start draw time)" : "Re-open applications"}</button></div>`;
  $("#regBtn").onclick = async () => {
    const open = !st.registration_open;
    if (!open && !confirm(`Close applications now?\n\n${people} people have applied. Nobody can apply after this, and Ram's Shuffle button unlocks.`)) return;
    const r = await DN.rpc("dn_admin_set_registration", { p_pin: auth.token, p_open: open }); if (!r.ok) toast(r.message); pollState();
  };
}
function winnerPeople(d){
  const ents = (d.winner_ids || []).map(id => adm.entries.find(e => e.id === id)).filter(Boolean), out = [];
  ents.forEach(e => { out.push({ n: e.name, p: e.phone, code: e.code }); if (e.category === "couple") out.push({ n: e.partner_name, p: e.partner_phone, code: e.code }); });
  return out;
}
function waWinner(d, x, people){
  const Z = P(d.category), others = people.map(y => y.n).filter(n => n !== x.n);
  const t = `Assalamu Alaikum / Namaste ${x.n} 🎉\n\nCONGRATULATIONS! You have WON the *${Z.title}* in the Shaan Fitness lucky draw at AuraPeak Dandiya Nights 2K26${others.length ? " (together with " + others.join(" & ") + ")" : ""}.\n\n🏆 Winning ID: ${x.code}\n💪 Prize: ${Z.detail}\n🎟️ Voucher ID: ${Z.voucher}\n📅 Valid until: 26 Nov 2026\n\nYour digital voucher: ${DN.SITE}${Z.img}\n\n⚠️ Please collect your *physical voucher on stage* from the AuraPeak organiser — it is the only valid voucher. Bring it to Shaan Fitness to activate your package.\n\nWelcome to the Shaan Fitness family!\n— Sabir, Shaan Fitness`;
  return `https://wa.me/91${x.p}?text=${encodeURIComponent(t)}`;
}
async function shareVoucher(cat, name){
  const Z = P(cat);
  try {
    const blob = await (await fetch(Z.img)).blob();
    const file = new File([blob], `${Z.short.replace(/\s/g, "-")}-voucher.jpg`, { type: "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: `Congratulations ${name}! Your ${Z.title} voucher.` }); return; }
  } catch (_) {}
  window.open(Z.img, "_blank");
}
function winnerBlock(d, withActions){
  const Z = P(d.category), people = winnerPeople(d);
  return `<div class="wcard"><div class="row" style="align-items:center"><b style="color:var(--gold2)">${esc(Z.title)}</b>${d.status === "void" ? '<span class="pill off" style="flex:none">Not present – redrawn</span>' : ""}</div>
    ${people.map(x => `<div style="margin-top:12px"><div class="nm">${esc(x.n)}</div><div class="meta">${esc(x.code)} · +91 ${esc(x.p)}</div>
      ${withActions && d.status === "final" ? `<div class="row" style="margin-top:8px"><a class="btn wa sm" target="_blank" rel="noopener" href="${waWinner(d, x, people)}">Send on WhatsApp</a>
        <button class="btn sm ghost" data-share="${d.category}" data-name="${esc(x.n)}">Share voucher image</button></div>` : ""}</div>`).join("")}
    ${withActions && d.status === "final" ? `<div class="row" style="margin-top:12px"><button class="btn sm red" data-void="${d.id}" style="flex:none">Winner not present – redraw</button></div>` : ""}</div>`;
}
function paintWinners(){
  const el = $("#winList"); if (!el) return;
  const ds = (adm.draws || []).filter(d => d.status === "final" || d.status === "void");
  el.innerHTML = ds.length ? ds.map(d => winnerBlock(d, true)).join("") : `<p class="muted">No winners yet. They'll pop up here the moment Ram presses Draw.</p>`;
}
document.addEventListener("click", async (e) => {
  const s = e.target.closest("[data-share]"); if (s) { shareVoucher(s.dataset.share, s.dataset.name); return; }
  const v = e.target.closest("[data-void]"); if (!v) return;
  if (!confirm("Winner not present?\n\nThis cancels this result. Ram can then Shuffle and Draw this prize again — the same winner won't be picked again.")) return;
  const r = await DN.rpc("dn_admin_void_draw", { p_pin: auth.token, p_draw: v.dataset.void });
  toast(r.ok ? "Cancelled. Ram can now Shuffle & Draw again." : r.message); closeSheet(); await loadAdm(); pollState(); if (role() === "owner") viewAdmin();
});
async function winnerPopup(drawId){
  await loadAdm();
  const d = (adm.draws || []).find(x => x.id === drawId); if (!d) return;
  markSeen(drawId);
  DN.fn("dn-notify", { pin: auth.token, draw_id: drawId });   // email (sent once, even if Ram's phone already did)
  openSheet(`<h2>🏆 Winners · ${esc(P(d.category).short)}</h2>
    <p class="lead" style="margin-top:6px">Send each winner their congratulations &amp; voucher on WhatsApp. (Their email has been sent automatically.)</p>
    ${winnerBlock(d, true)}
    <div class="stack"><button class="btn ghost" data-close>Close</button></div>`);
  if (tab === "live") paintWinners();
}
function paintPeople(){
  const ents = adm.entries || [];
  const people = [];
  ents.forEach(e => { people.push({ g: e.goals || [] }); if (e.category === "couple") people.push({ g: e.partner_goals || [] }); });
  $("#adStats").innerHTML = `<div class="stat"><b>${people.length}</b><span>People</span></div><div class="stat"><b>${ents.filter(e => e.category === "couple").length}</b><span>Couples</span></div>
    <div class="stat"><b>${ents.filter(e => e.category === "single" && e.gender === "male").length}</b><span>Single men</span></div><div class="stat"><b>${ents.filter(e => e.category === "single" && e.gender === "female").length}</b><span>Single women</span></div>`;
  const cnt = {}; people.forEach(p => p.g.forEach(g => cnt[g] = (cnt[g] || 0) + 1));
  const max = Math.max(1, ...Object.values(cnt));
  $("#goalBars").innerHTML = GOALS.map(g => `<div class="bar"><span>${g}</span><span class="t"><i style="width:${(cnt[g] || 0) / max * 100}%"></i></span><span class="n">${cnt[g] || 0}</span></div>`).join("");
  paintRows();
}
function paintRows(){
  const el = $("#rows"); if (!el) return;
  const q = ($("#q") && $("#q").value.trim().toLowerCase()) || "";
  const goals = (g, o) => (g || []).join(", ") + (o ? ` (${o})` : "");
  const list = (adm.entries || []).filter(e => !q || JSON.stringify(e).toLowerCase().includes(q)).slice().reverse();
  el.innerHTML = list.map(e => {
    const t = new Date(e.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    const row = (n, gd, p, m, g) => `<td>${esc(n)} <span class="muted">(${gd ? gd[0].toUpperCase() : ""})</span></td><td><a href="https://wa.me/91${esc(p)}" target="_blank" rel="noopener">${esc(p)}</a></td><td>${esc(m)}</td><td>${esc(g)}</td>`;
    const span = e.category === "couple" ? 2 : 1;
    return `<tr><td rowspan="${span}"><b>${esc(e.code)}</b></td>${row(e.name, e.gender, e.phone, e.email, goals(e.goals, e.goal_other))}<td rowspan="${span}">${t}</td></tr>`
      + (e.category === "couple" ? `<tr>${row(e.partner_name, e.partner_gender, e.partner_phone, e.partner_email, goals(e.partner_goals, e.partner_goal_other))}</tr>` : "");
  }).join("") || `<tr><td colspan="6" class="muted">No applicants yet.</td></tr>`;
}
function csv(){
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const win = new Set((adm.draws || []).filter(d => d.status === "final").flatMap(d => d.winner_ids || []));
  const out = [["Lucky Draw ID","Category","Name","Gender","Mobile","Email","Goals","Other goal","Partner of","Applied at","Won"].map(cell).join(",")];
  (adm.entries || []).forEach(e => {
    const t = new Date(e.created_at).toLocaleString("en-IN"), w = win.has(e.id) ? "YES" : "";
    out.push([e.code, e.category, e.name, e.gender, e.phone, e.email, (e.goals || []).join(" | "), e.goal_other, e.category === "couple" ? e.partner_name : "", t, w].map(cell).join(","));
    if (e.category === "couple") out.push([e.code, e.category, e.partner_name, e.partner_gender, e.partner_phone, e.partner_email, (e.partner_goals || []).join(" | "), e.partner_goal_other, e.name, t, w].map(cell).join(","));
  });
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + out.join("\n")], { type: "text/csv;charset=utf-8" }));
  a.download = "dandiya-lucky-draw-applicants.csv"; a.click();
}
async function reset(scope){
  if (!confirm(scope === "all" ? "GO LIVE?\n\nThis hides ALL current applicants and results (archived, not deleted) and re-opens applications for the real event." : "Reset the draw results? Applicants stay.")) return;
  if (scope === "all" && prompt("Type GO LIVE to confirm") !== "GO LIVE") return;
  const r = await DN.rpc("dn_admin_reset", { p_pin: auth.token, p_scope: scope });
  if (!r.ok) return toast(r.message);
  await loadAdm(); await pollState(); toast(scope === "all" ? "Done — applications are open and everything is clean." : "Draw results cleared.");
}

/* ---------------- glass jar of chits ---------------- */
// Geometry (px, inside .jarwrap): body circle centre (CX, CY), radius BR.
const CX = 140, CY = 244, BR = 140;
class Jar {
  constructor(host, n){
    this.host = host; this.mode = "rest"; this.dead = false; this.chits = [];
    host.innerHTML = `<div class="jarwrap"><div class="jar-body"><div class="jar-chits"></div><div class="jar-shine"></div></div><div class="jar-neck"></div><div class="jar-lid"></div></div>`;
    this.wrap = $(".jarwrap", host); this.box = $(".jar-chits", host);
    const R = BR - 18;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div"); el.className = "chit" + (i % 3 === 0 ? " c2" : i % 3 === 1 ? " c3" : "");
      this.box.appendChild(el);
      const a = Math.random() * Math.PI * 2, d = Math.random() * R * .8;
      this.chits.push({ el, x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0, r: Math.random() * 360, vr: 0 });
    }
    for (let i = 0; i < 160; i++) this.step();   // settle into a pile before showing
    this.paint();
    const loop = () => { if (this.dead || !document.body.contains(this.wrap)) return; this.step(); this.paint(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  step(){
    const R = BR - 18, ch = this.chits, mode = this.mode;
    for (const c of ch) {
      if (c.gone) continue;
      if (mode === "shuffle") {
        // every chit follows its own orbit round the jar, changing lanes now and then — a tumbling drum
        if (c.or == null || Math.random() < .012) { c.or = 25 + Math.random() * (R - 25); c.w = (.035 + Math.random() * .08) * (Math.random() < .25 ? -1 : 1); }
        if (c.th == null) c.th = Math.atan2(c.y, c.x);
        c.th += c.w;
        const tx = Math.cos(c.th) * c.or, ty = Math.sin(c.th) * c.or;
        c.vx += (tx - c.x) * .09 + (Math.random() - .5) * 1.4;
        c.vy += (ty - c.y) * .09 + (Math.random() - .5) * 1.4;
        c.vr += (Math.random() - .5) * 4;
        c.vx *= .8; c.vy *= .8; c.vr *= .88;
      } else {
        c.vy += .55; c.vx *= .9; c.vy *= .92; c.vr *= .8;           // gravity: settle to the bottom
      }
      c.x += c.vx; c.y += c.vy; c.r += c.vr;
      const d = Math.hypot(c.x, c.y);
      if (d > R) { const nx = c.x / d, ny = c.y / d; c.x = nx * R; c.y = ny * R; const vn = c.vx * nx + c.vy * ny;
        if (vn > 0) { c.vx -= (1 + (mode === "shuffle" ? .7 : .2)) * vn * nx; c.vy -= (1 + (mode === "shuffle" ? .7 : .2)) * vn * ny; } }
    }
    if (mode !== "shuffle") for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) {   // keep chits from stacking
      const a = ch[i], b = ch[j]; if (a.gone || b.gone) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < (mode === "shuffle" ? 34 : 24)) { const p = (24 - d) / 2 / d; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; }
    }
  }
  paint(){ for (const c of this.chits) if (!c.gone) c.el.style.transform = `translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px) rotate(${c.r.toFixed(0)}deg)`; }
  shuffle(){ this.mode = "shuffle"; this.chits.forEach(c => { c.or = null; c.th = Math.atan2(c.y, c.x); c.vy -= Math.random() * 10; }); }
  rest(){ this.mode = "rest"; }
  // Draw: the chit(s) nearest the middle rise out of the jar with a glow and open to show the winner.
  draw(winners, done){
    this.mode = "slow";
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    (async () => {
      await wait(700);
      const picks = [...this.chits].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)).slice(0, winners.length);
      const targets = winners.length === 1 ? [{ x: CX, y: 40 }] : [{ x: CX, y: -6 }, { x: CX, y: 92 }];
      const risers = picks.map((c) => {
        c.gone = true; c.el.style.visibility = "hidden";
        const el = document.createElement("div"); el.className = "chit riser";
        el.style.transform = `translate(${CX + c.x - 20}px,${CY + c.y - 10}px) rotate(${c.r % 360}deg)`;
        this.wrap.appendChild(el); return el;
      });
      await wait(60);
      risers.forEach((el) => { el.classList.add("glow"); el.style.transform = `translate(${CX - 20}px,${CY - BR - 30}px) rotate(0deg) scale(1.3)`; });
      await wait(1000);
      risers.forEach((el, i) => { el.style.transform = `translate(${targets[i].x - 20}px,${targets[i].y - 10}px) rotate(0deg) scale(1.6)`; });
      await wait(900);
      risers.forEach((el, i) => { const w = winners[i];
        el.innerHTML = `<div class="paper-in"><b>${esc(w ? w.name : "")}</b><span>${esc(w ? w.code : "")}</span></div>`;
        el.classList.add("open"); el.style.transform = `translate(${targets[i].x - 125}px,${targets[i].y - 40}px)`; });
      await wait(1900);
      this.dead = true; done();
    })();
  }
}

/* ---------------- live draw engine (shared) ---------------- */
const Live = {
  el: null, mode: "", landing: false, key: "", jar: null,
  mount(el){ this.el = el; this.mode = ""; this.key = ""; this.jar = null; this.landing = false; if (st) this.update(st); },
  alive(){ return this.el && document.body.contains(this.el); },
  head(c){ const Z = P(c);
    return `<div class="livehead"><span class="livetag"><i></i>LIVE</span></div>
      <h1 class="title" style="margin-top:12px">${c === "couple" ? "Couples Draw" : "Singles Duo Draw"}</h1>
      <div class="big" style="font-size:clamp(44px,13vw,66px)">${Z.amt}</div><p class="sub">${Z.short}</p>`; },
  reels(c){ const r = (t, i) => `<div class="reel" id="r${i}"><div class="tag">${t}</div><div class="nm">—</div><div class="cd">&nbsp;</div></div>`;
    return `<div class="reels">${c === "couple" ? r("Couple Edition winner", 0) : r("Duo winner · Male", 0) + r("Duo winner · Female", 1)}</div>`; },
  wins(s){ return s.category === "couple" ? [s.winners[0]] : ["male","female"].map(g => s.winners.find(w => w.gender === g)); },
  jarScreen(c, text, n){
    this.el.innerHTML = `${this.head(c)}<div id="jarHost"></div><p class="note" id="jarTxt" style="font-size:15px;color:var(--gold2);margin-top:6px">${text}</p>`;
    this.jar = new Jar($("#jarHost", this.el), Math.max(12, Math.min(26, n || 22)));
  },
  spin(s){
    this.mode = "spinning"; this.key = "";
    const n = (s.pool || []).length, text = `Shuffling ${n} chits…`;
    if (!this.jar || !document.body.contains(this.jar.wrap) || this.jarCat !== s.category) this.jarScreen(s.category, text, n);
    else $("#jarTxt", this.el).textContent = text;
    this.jarCat = s.category; this.jar.shuffle();
  },
  land(s){
    this.landing = true;
    if (!this.jar) { this.landing = false; return this.show(s, true); }
    $("#jarTxt", this.el).textContent = "Drawing the winning chit…";
    this.jar.draw(this.wins(s), () => { this.landing = false; this.show(s, true); });
  },
  show(s, celebrate){
    this.jar = null;
    this.el.innerHTML = `${this.head(s.category)}${ORNAMENT}${this.reels(s.category)}`;
    const mine = me && me.code; let iWon = false;
    this.wins(s).forEach((w, i) => { const r = $("#r" + i, this.el); if (!r || !w) return; r.classList.add("win");
      $(".nm", r).textContent = w.name; $(".cd", r).textContent = w.code;
      if (mine && w.code === mine) { iWon = true; r.classList.add("me"); r.insertAdjacentHTML("beforeend", `<div class="youwon">★ THAT'S YOU! ★</div>`); } });
    const Z = P(s.category);
    this.el.insertAdjacentHTML("beforeend", `<div class="congr">Congratulations!</div><img class="prizeimg" src="${Z.img}" alt="${esc(Z.title)} voucher">
      <p class="note">Winners: please come to the stage. The physical voucher handed over by the AuraPeak organiser is the only valid voucher.</p>`);
    this.mode = "revealed"; this.key = s.draw_id;
    if (celebrate) { confetti(); setTimeout(paintRamCtrl, 2500); }
    if (celebrate && iWon) youWonSheet(s.category);
  },
  idle(s){
    const c = s.category || "couple";
    const k = [s.registration_open, s.couples, s.singles_male, s.singles_female, c].join();
    if (this.mode === "idle" && this.key === k) return;
    this.mode = "idle"; this.key = k;
    if (s.registration_open) {
      this.jar = null;
      this.el.innerHTML = `<div class="panel" style="text-align:center">
        <div class="livehead"><span class="livetag"><i></i>LIVE</span></div>
        <h3 style="margin-top:14px">Applications are open</h3>
        <p class="muted">The draw happens live at the event. You'll get a pop-up here when it starts.</p>
        <div class="stats3"><div class="stat"><b>${s.couples}</b><span>Couples</span></div><div class="stat"><b>${s.singles_male}</b><span>Single men</span></div><div class="stat"><b>${s.singles_female}</b><span>Single women</span></div></div></div>`;
      return;
    }
    const n = c === "couple" ? s.couples : s.singles_male + s.singles_female;
    this.jarScreen(c, `Next: ${c === "couple" ? "Couples" : "Singles Duo"} draw · waiting for the shuffle`, n);
    this.jarCat = c;
  },
  update(s){
    if (!this.alive()) return;
    if (s.phase === "spinning") { if (this.mode !== "spinning") this.spin(s); return; }
    if (s.phase === "revealed") { if (this.landing) return;
      if (this.mode === "spinning") return this.land(s);
      if (this.key !== s.draw_id) this.show(s, false); return; }
    if (this.landing) return;
    this.idle(s);
  },
};
function youWonSheet(c){
  openSheet(`<h2>🎉 Congratulations!</h2><div class="youwon" style="text-align:center">YOU WON THE ${esc(P(c).title.toUpperCase())}</div>
    <img class="prizeimg" src="${P(c).img}" alt="">
    <p class="lead" style="margin-top:12px">Please come to the stage now to collect your physical voucher from the AuraPeak organiser. We'll also WhatsApp and email you.</p>
    <div class="stack"><button class="btn" data-close>Alhamdulillah! Okay</button></div>`);
  me && (me.won = { category: c });
}
function confetti(){
  const c = $("#cf"), x = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight;
  const cols = ["#e8cf8e","#c9a54e","#f6e3a8","#ffffff","#b8913a","#d23b3b"];
  const ps = Array.from({ length: 170 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, r: 4 + Math.random() * 5,
    vx: -1.5 + Math.random() * 3, vy: 2 + Math.random() * 3.5, a: Math.random() * 6, va: -.2 + Math.random() * .4, c: cols[Math.floor(Math.random() * cols.length)] }));
  let f = 0;
  (function tick(){ x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
    if (++f < 320) requestAnimationFrame(tick); else x.clearRect(0, 0, c.width, c.height); })();
}

/* ---------------- keep screen awake ---------------- */
let wake = null;
async function keepAwake(){ try { if ("wakeLock" in navigator && document.visibilityState === "visible" && !wake) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => wake = null); } } catch (_) {} }
document.addEventListener("visibilitychange", keepAwake);
document.addEventListener("click", keepAwake, { once: true });

/* ---------------- state sync ---------------- */
function liveVisible(){ const b = $("#liveBox"); if (!b) return false; const r = b.getBoundingClientRect(); return r.top < innerHeight - 120 && r.bottom > 80; }
function goLive(){
  closeSheet();
  if (role() === "owner" && tab !== "live") { tab = "live"; viewAdmin(); }
  if (!$("#liveBox")) route();
  setTimeout(() => $("#liveBox") && $("#liveBox").scrollIntoView({ behavior: "smooth", block: "start" }), 150);
}
$("#livebar").onclick = goLive;
function paintLivebar(){
  const on = st && (st.phase === "spinning" || (st.phase === "revealed" && role() !== "drawer")) && !liveVisible();
  $("#livebar").classList.toggle("on", !!on);
  if (st) $("#livebarTxt").textContent = st.phase === "spinning" ? "THE DRAW IS LIVE NOW · TAP TO WATCH" : "WINNERS ANNOUNCED · TAP TO SEE";
}
addEventListener("scroll", paintLivebar, { passive: true });

function onState(s){
  const prev = st; st = s;
  Live.update(s);
  paintLivebar();
  const r = role();
  // draw just started → pop-up for everyone except Ram
  if (s.phase === "spinning" && (!prev || prev.phase !== "spinning") && r !== "drawer" && prev) {
    openSheet(`<div class="livehead"><span class="livetag"><i></i>LIVE</span></div>
      <h2 style="margin-top:12px">The ${s.category === "couple" ? "Couples" : "Singles Duo"} draw has started!</h2>
      <p class="lead">Watch the names being shuffled live, right now.</p>
      <div class="stack"><button class="btn" id="watchBtn">Watch live</button></div>`);
    const w = $("#watchBtn"); if (w) w.onclick = goLive;
  }
  // winners revealed
  if (s.phase === "revealed" && s.draw_id && (!prev || prev.draw_id !== s.draw_id)) {
    if (r === "owner" && !seen.has(s.draw_id)) setTimeout(() => winnerPopup(s.draw_id), prev ? 5600 : 300);
    if (r === "drawer") loadAdm().then(paintRamCtrl);
  }
  if (r === "owner") {
    paintReg();
    const changed = prev && (prev.couples !== s.couples || prev.singles_male !== s.singles_male || prev.singles_female !== s.singles_female || prev.phase !== s.phase);
    if (changed) loadAdm().then(() => { if (tab === "people") paintPeople(); if (tab === "live") paintWinners(); });
  }
  paintRamCtrl();
  if (r === "guest" && prev && prev.registration_open !== s.registration_open && $("#applyBtn, .hero-cta")) viewHome();
}
async function pollState(){
  try { const r = await DN.rest("dn_state?id=eq.1&select=*"); if (r && r[0] && (!st || r[0].updated_at !== st.updated_at)) onState(r[0]); } catch (_) {}
}
(async () => {
  await pollState();
  await route();
  setInterval(pollState, 4000);
  try { supabase.createClient(DN.SB_URL, DN.SB_KEY).channel("dn_state")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dn_state" }, (p) => { if (!st || p.new.updated_at !== st.updated_at) onState(p.new); }).subscribe(); } catch (_) {}
})();
