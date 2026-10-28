import { db, ref, get, set, onValue } from "./firebase-config.js";

/* ===== Toast ===== */
export function toast(msg, type = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = "toast"), 2600);
}

/* ===== Random 8 ký tự chữ + số ===== */
export function rand8() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ===== Sinh key khách BLACK_xxxxxxxx (không trùng) ===== */
export async function genGuestKey() {
  while (true) {
    const key = "BLACK_" + rand8();
    const snap = await get(ref(db, `keys/${key}`));
    if (!snap.exists()) return key;
  }
}

/* ===== Sinh key admin/user cố định ===== */
export async function genFixedKey(role) {
  const prefix = role === "admin" ? "BLACKADMIN_" : "BLACKUSER_";
  while (true) {
    const key = prefix + rand8();
    const snap = await get(ref(db, `accounts_by_key/${key}`));
    if (!snap.exists()) return key;
  }
}

/* ===== Format giây -> HH:MM:SS ===== */
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/* ===== Copy ===== */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Đã sao chép!", "ok");
  } catch {
    toast("Không thể sao chép", "error");
  }
}

/* ===== Log hành động ===== */
export async function writeLog(actor, action, detail = "") {
  const id = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  await set(ref(db, `logs/${id}`), {
    actor, action, detail,
    time: new Date().toISOString()
  });
}

/* ===== Bảng key khách: thời gian & giới hạn acc ===== */
export const KEY_DURATIONS = {
  "1 phút":   { sec: 60,          maxAcc: 1 },
  "1 giờ":    { sec: 3600,        maxAcc: 4 },
  "24 giờ":   { sec: 86400,       maxAcc: 8 },
  "1 tháng":  { sec: 2592000,     maxAcc: 20 },
  "1 năm":    { sec: 31536000,    maxAcc: Infinity },
};

export function durationLabel(sec) { return fmtTime(sec); }

/* ===== Session ===== */
export const session = {
  save(user) { sessionStorage.setItem("blk_user", JSON.stringify(user)); },
  get() {
    try { return JSON.parse(sessionStorage.getItem("blk_user")); }
    catch { return null; }
  },
  clear() { sessionStorage.removeItem("blk_user"); },
};

/* ===== Tạo tài khoản Owner mặc định nếu chưa có ===== */
export async function ensureOwner() {
  const snap = await get(ref(db, "accounts/black"));
  if (snap.exists()) return;
  await set(ref(db, "accounts/black"), {
    username: "black",
    password: "1",
    role: "owner",
    key: "BLACKOWNER_30102011",
    createdAt: new Date().toISOString(),
  });
  await set(ref(db, "accounts_by_key/BLACKOWNER_30102011"), "black");
  await writeLog("system", "Khởi tạo Owner", "black");
}

/* ===== Lấy danh sách key khách (realtime) ===== */
export function listenKeys(callback) {
  onValue(ref(db, "keys"), (snap) => {
    const data = snap.val() || {};
    callback(Object.entries(data).map(([k, v]) => ({ key: k, ...v })));
  });
}

/* ===== Trạng thái key khách ===== */
export function keyStatus(k) {
  if (!k.activatedAt) return "inactive";
  const dur = KEY_DURATIONS[k.duration]?.sec || 0;
  if (Date.now() / 1000 >= k.activatedAt + dur) return "expired";
  return "active";
}

/* Thời gian còn lại của key khách (giây) */
export function keyRemain(k) {
  if (!k.activatedAt) return KEY_DURATIONS[k.duration]?.sec || 0;
  const dur = KEY_DURATIONS[k.duration]?.sec || 0;
  return Math.max(0, k.activatedAt + dur - Date.now() / 1000);
}

/* ===== TẠO VÂN TAY THIẾT BỊ (Fingerprint) ===== */
export function getDeviceFingerprint() {
  // Lấy thông tin cơ bản của trình duyệt/hệ điều hành
  const nav = window.navigator;
  const screen = window.screen;
  const data = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 'unknown',
  ].join('|');
  
  // Hash đơn giản để ra 1 chuỗi ngắn
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "DEV_" + Math.abs(hash).toString(36);
}

/* ===== LẤY TÊN THIẾT BỊ (OS/Browser) ===== */
export function getDeviceName() {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  if (ua.indexOf("Win") != -1) os = "Windows";
  if (ua.indexOf("Mac") != -1) os = "MacOS";
  if (ua.indexOf("Linux") != -1) os = "Linux";
  if (ua.indexOf("Android") != -1) os = "Android";
  if (ua.indexOf("like Mac") != -1) os = "iOS";

  if (ua.indexOf("Chrome") != -1) browser = "Chrome";
  else if (ua.indexOf("Firefox") != -1) browser = "Firefox";
  else if (ua.indexOf("Safari") != -1) browser = "Safari";
  else if (ua.indexOf("Edge") != -1) browser = "Edge";

  return `${os} - ${browser}`;
}
