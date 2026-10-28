import { db, ref, get, update } from "./firebase-config.js";
import { session, toast, ensureOwner, KEY_DURATIONS, writeLog, getDeviceName } from "./utils.js";

/* Đăng nhập mật khẩu */
export async function loginWithPassword(username, password) {
  username = (username || "").trim();
  if (!username || !password) return { ok: false, msg: "Nhập đủ thông tin" };
  if (!db) return { ok: false, msg: "Firebase chưa khởi tạo" };

  let snap;
  try {
    snap = await get(ref(db, `accounts/${username}`));
  } catch (e) {
    return { ok: false, msg: "Lỗi DB: " + e.message };
  }

  if (!snap.exists()) return { ok: false, msg: "Tài khoản không tồn tại" };
  const acc = snap.val();
  if (acc.password !== password) return { ok: false, msg: "Sai mật khẩu" };

  return finishLogin(acc, username);
}

/* Đăng nhập Key */
export async function loginWithKey(key) {
  key = (key || "").trim();
  if (!key) return { ok: false, msg: "Nhập private key" };
  if (!db) return { ok: false, msg: "Firebase chưa khởi tạo" };

  try {
    // 1) Key của account (owner/admin/user)
    const accKeySnap = await get(ref(db, `accounts_by_key/${key}`));
    if (accKeySnap.exists()) {
      const username = accKeySnap.val();
      const accSnap = await get(ref(db, `accounts/${username}`));
      if (!accSnap.exists()) return { ok: false, msg: "Key không tồn tại hoặc đã hết hạn" };
      return finishLogin(accSnap.val(), username);
    }

    // 2) Key khách
    const kSnap = await get(ref(db, `keys/${key}`));
    if (!kSnap.exists()) return { ok: false, msg: "Key không tồn tại hoặc đã hết hạn" };

    const kData = kSnap.val();
    const dur = KEY_DURATIONS[kData.duration]?.sec || 0;

    if (kData.activatedAt && Date.now() / 1000 >= kData.activatedAt + dur) {
      return { ok: false, msg: "Key không tồn tại hoặc đã hết hạn" };
    }

    // KÍCH HOẠT LẦN ĐẦU
    if (!kData.activatedAt) {
      const now = Math.floor(Date.now() / 1000);
      await update(ref(db, `keys/${key}`), { activatedAt: now });
      kData.activatedAt = now;
    }

    // 3) LOGIC CHẶN NHIỀU THIẾT BỊ
    const devId = window.DEVICE_ID || "unknown_device";
    const devName = getDeviceName();
    const currentDevices = kData.devices || {};

    // Kiểm tra xem đã có trong danh sách chưa
    const isExist = currentDevices[devId] !== undefined;
    const maxDevices = kData.maxDevices || 1;

    if (!isExist) {
      if (Object.keys(currentDevices).length >= maxDevices && maxDevices !== -1) {
        return { ok: false, msg: `Key đã đạt giới hạn ${maxDevices} thiết bị` };
      }
      // Thêm thiết bị mới
      currentDevices[devId] = {
        name: devName,
        loginAt: Date.now()
      };
      await update(ref(db, `keys/${key}/devices`), currentDevices);
      await writeLog(key, "Đăng nhập TB mới", `${devName} (${devId})`);
    }

    const guestAcc = {
      username: `guest_${key.slice(-4)}`,
      role: "guest",
      key,
      guestKey: { ...kData, devices: currentDevices },
    };
    return finishLogin(guestAcc, guestAcc.username, { guestKey: guestAcc.guestKey, key });

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
