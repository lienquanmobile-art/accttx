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

/* Hiển thị thời gian mẫu cho form tạo key (giây -> chuỗi) */
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
