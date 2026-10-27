import { db, ref, get, update } from "./firebase-config.js";
import { session, toast, ensureOwner, KEY_DURATIONS, writeLog } from "./utils.js";

/* Đăng nhập bằng username/password */
export async function loginWithPassword(username, password) {
  username = (username || "").trim();
  if (!username || !password) return { ok: false, msg: "Nhập đủ thông tin" };
  if (!db) return { ok: false, msg: "Firebase chưa khởi tạo (kiểm tra databaseURL)" };

  let snap;
  try {
    snap = await get(ref(db, `accounts/${username}`));
  } catch (e) {
    console.error(e);
    return { ok: false, msg: "Không đọc được DB: " + e.message };
  }

  if (!snap.exists()) return { ok: false, msg: "Tài khoản không tồn tại" };
  const acc = snap.val();
  if (acc.password !== password) return { ok: false, msg: "Sai mật khẩu" };

  return finishLogin(acc, username);
}

/* Đăng nhập bằng private key */
export async function loginWithKey(key) {
  key = (key || "").trim();
  if (!key) return { ok: false, msg: "Nhập private key" };
  if (!db) return { ok: false, msg: "Firebase chưa khởi tạo (kiểm tra databaseURL)" };

  try {
    // 1) Thử key của account (owner/admin/user)
    const accKeySnap = await get(ref(db, `accounts_by_key/${key}`));
    if (accKeySnap.exists()) {
      const username = accKeySnap.val();
      const accSnap = await get(ref(db, `accounts/${username}`));
      if (!accSnap.exists()) return { ok: false, msg: "Key không tồn tại hoặc đã hết hạn" };
      return finishLogin(accSnap.val(), username);
    }

    // 2) Thử key khách
    const kSnap = await get(ref(db, `keys/${key}`));
    if (!kSnap.exists()) return { ok: false, msg: "Key không tồn tại hoặc đã hết hạn" };

    const kData = kSnap.val();
    const dur = KEY_DURATIONS[kData.duration]?.sec || 0;

    // Nếu đã kích hoạt → check hạn
    if (kData.activatedAt && Date.now() / 1000 >= kData.activatedAt + dur) {
      return { ok: false, msg: "Key không tồn tại hoặc đã hết hạn" };
    }

    // Kích hoạt lần đầu (chỉ set nếu chưa có, tránh ghi đè khi login đồng thời)
    if (!kData.activatedAt) {
      const now = Math.floor(Date.now() / 1000);
      await update(ref(db, `keys/${key}`), { activatedAt: now });
      kData.activatedAt = now;
    }

    const guestAcc = {
      username: `guest_${key.slice(-4)}`,
      role: "guest",
      key,
      guestKey: kData,
    };
    return finishLogin(guestAcc, guestAcc.username, { guestKey: kData, key });
  } catch (e) {
    console.error(e);
    return { ok: false, msg: "Lỗi truy vấn: " + e.message };
  }
}

function finishLogin(acc, username, extra = {}) {
  const user = {
    username,
    role: acc.role,
    key: acc.key || null,
    ...extra,
  };
  session.save(user);
  try { writeLog(username, "Đăng nhập", acc.role); } catch {}
  return { ok: true, user };
}

export { ensureOwner };
