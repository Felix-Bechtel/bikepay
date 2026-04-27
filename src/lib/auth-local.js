// Local-only multi-account auth, stored in localStorage.
//
// Each account: { id, email, name, payoutPhone, salt, hash, createdTs, data }
// Passwords are hashed with PBKDF2 (SHA-256, 100k iterations, salted) — no
// plaintext is ever persisted.

const KEY_ACCOUNTS = "bk:accounts";
const KEY_CURRENT = "bk:currentAccountId";
const ITERATIONS = 100_000;

function loadAll() {
  try {
    const raw = localStorage.getItem(KEY_ACCOUNTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(accounts) {
  localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(accounts));
}

export function listAccounts() {
  return loadAll().map(({ id, email, name }) => ({ id, email, name }));
}

export function getCurrentId() {
  return localStorage.getItem(KEY_CURRENT) || null;
}

export function setCurrentId(id) {
  if (id) localStorage.setItem(KEY_CURRENT, id);
  else localStorage.removeItem(KEY_CURRENT);
}

export function findAccount(id) {
  return loadAll().find((a) => a.id === id) || null;
}

export function findByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return loadAll().find((a) => a.email.toLowerCase() === e) || null;
}

export async function signup({ email, name, password, payoutPhone }) {
  const cleaned = {
    email: String(email || "").trim(),
    name: String(name || "").trim(),
    payoutPhone: normalizePhone(payoutPhone),
  };
  if (!isEmail(cleaned.email)) throw new Error("Invalid email");
  if (cleaned.name.length < 1) throw new Error("Name required");
  if (!password || password.length < 6) throw new Error("Password must be 6+ chars");
  if (!cleaned.payoutPhone) throw new Error("Payout phone required");
  if (findByEmail(cleaned.email)) throw new Error("Email already in use on this device");

  const salt = randomHex(16);
  const hash = await pbkdf2(password, salt);
  const account = {
    id: newId(),
    email: cleaned.email,
    name: cleaned.name,
    payoutPhone: cleaned.payoutPhone,
    salt,
    hash,
    createdTs: Date.now(),
    data: { sessions: [], withdrawals: [], hideWallet: false },
  };
  const all = loadAll();
  all.push(account);
  saveAll(all);
  setCurrentId(account.id);
  return publicAccount(account);
}

export async function login({ email, password }) {
  const acc = findByEmail(email);
  if (!acc) throw new Error("No account with that email on this device");
  const hash = await pbkdf2(password, acc.salt);
  if (hash !== acc.hash) throw new Error("Wrong password");
  setCurrentId(acc.id);
  return publicAccount(acc);
}

export function logoutLocal() {
  setCurrentId(null);
}

export function setAccountData(id, data) {
  const all = loadAll();
  const i = all.findIndex((a) => a.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], data };
  saveAll(all);
}

export function updateProfile(id, patch) {
  const all = loadAll();
  const i = all.findIndex((a) => a.id === id);
  if (i < 0) return null;
  if (patch.name !== undefined) all[i].name = String(patch.name).trim();
  if (patch.payoutPhone !== undefined)
    all[i].payoutPhone = normalizePhone(patch.payoutPhone);
  saveAll(all);
  return publicAccount(all[i]);
}

export async function changePassword(id, oldPw, newPw) {
  const all = loadAll();
  const i = all.findIndex((a) => a.id === id);
  if (i < 0) throw new Error("No such account");
  const oldHash = await pbkdf2(oldPw, all[i].salt);
  if (oldHash !== all[i].hash) throw new Error("Old password wrong");
  if (!newPw || newPw.length < 6) throw new Error("New password must be 6+ chars");
  const salt = randomHex(16);
  all[i].salt = salt;
  all[i].hash = await pbkdf2(newPw, salt);
  saveAll(all);
}

export function deleteAccount(id) {
  const all = loadAll().filter((a) => a.id !== id);
  saveAll(all);
  if (getCurrentId() === id) setCurrentId(null);
}

// ---------- exported helpers (shared by actions.js) ----------

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id-" + randomHex(16);
}

export function randomHex(bytes) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}

// Loose phone input ("(519) 496-0491", "5194960491", "+1 519-496-0491")
// normalized to E.164. Defaults to country code 1.
export function normalizePhone(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return digits.length >= 8 ? digits : "";
  }
  digits = digits.replace(/^0+/, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (digits.length >= 8) return "+" + digits;
  return "";
}

export function formatPhone(e164) {
  const d = (e164 || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return e164 || "";
}

// ---------- private ----------

function publicAccount(a) {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    payoutPhone: a.payoutPhone,
    createdTs: a.createdTs,
  };
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function pbkdf2(password, saltHex) {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(b) {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
