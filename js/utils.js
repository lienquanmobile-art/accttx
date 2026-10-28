import { db, ref, get, set, onValue } from "./firebase-config.js";

/* ===== Toast ===== */
export function toast(msg, type = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = "toast"), 2600);
}

/* ===== Random 8 ký tự ===== */
export function rand8() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ===== Sinh key khách ===== */
export async function genGuestKey() {
  while (true) {
    const key = "BLACK_" + rand8();
    const snap = await get(ref(db, `keys/${key}`));
    if (!snap.exists()) return key;
  }
}

/* ===== Sinh key cố định ===== */
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

/* ===== Log ===== */
export async function writeLog(actor, action, detail = "") {
  const id = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  await set(ref(db, `logs/${id}`), {
    actor, action, detail,
    time: new Date().toISOString()
  });
}

/* ===== KEY DURATIONS ===== */
export const KEY_DURATIONS = {
  "1 phút":   { sec: 60,          maxAcc: 1 },
  "1 giờ":    { sec: 3600,        maxAcc: 4 },
  "24 giờ":   { sec: 86400,       maxAcc: 8 },
  "1 tháng":  { sec: 2592000,     maxAcc: 20 },
  "1 năm":    { sec: 31536000,    maxAcc: Infinity },
};

/* ===== Session ===== */
export const session = {
  save(user) { sessionStorage.setItem("blk_user", JSON.stringify(user)); },
  get() {
    try { return JSON.parse(sessionStorage.getItem("blk_user")); }
    catch { return null; }
  },
  clear() { sessionStorage.removeItem("blk_user"); },
};

/* ===== Owner mặc định ===== */
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

/* ===== Lắng nghe Key ===== */
export function listenKeys(callback) {
  onValue(ref(db, "keys"), (snap) => {
    const data = snap.val() || {};
    callback(Object.entries(data).map(([k, v]) => ({ key: k, ...v })));
  });
}

/* ===== Trạng thái Key ===== */
export function keyStatus(k) {
  if (!k.activatedAt) return "inactive";
  const dur = KEY_DURATIONS[k.duration]?.sec || 0;
  if (Date.now() / 1000 >= k.activatedAt + dur) return "expired";
  return "active";
}

/* ===== Thời gian còn lại ===== */
export function keyRemain(k) {
  if (!k.activatedAt) return KEY_DURATIONS[k.duration]?.sec || 0;
  const dur = KEY_DURATIONS[k.duration]?.sec || 0;
  return Math.max(0, k.activatedAt + dur - Date.now() / 1000);
}

/* ===== Lấy tên thiết bị tự động (Cố gắng bắt cả tên dòng máy) ===== */
export function getDeviceName() {
  const ua = navigator.userAgent;
  let os = "Không xác định";
  let browser = "Không xác định";

  // 1. Nhận diện Hệ điều hành & Tên dòng máy (Brand)
  if (/android/i.test(ua)) {
    os = "Android";
    // Cố gắng lấy tên hãng máy (Xiaomi, Samsung, Oppo...)
    if (/Mi|Redmi|POCO/i.test(ua)) os = "Xiaomi";
    else if (/SM-/i.test(ua)) os = "Samsung";
    else if (/CPH|OPPO/i.test(ua)) os = "Oppo";
    else if (/vivo/i.test(ua)) os = "Vivo";
    else if (/Huawei/i.test(ua)) os = "Huawei";
    else if (/Pixel/i.test(ua)) os = "Google Pixel";
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    os = "iOS";
  } else if (/Win/i.test(ua)) {
    os = "Windows";
  } else if (/Mac/i.test(ua)) {
    os = "MacOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  // 2. Nhận diện Trình duyệt
  if (/CocCoc/i.test(ua)) browser = "Cốc Cốc";
  else if (/Zalo/i.test(ua)) browser = "Zalo";
  else if (/Edg/i.test(ua)) browser = "Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/CriOS/i.test(ua)) browser = "Chrome (iOS)";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua)) browser = "Safari";

  return `${os} - ${browser}`;
}
