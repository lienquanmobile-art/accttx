import { db, ref, get, update } from "./firebase-config.js";
import { session, toast, ensureOwner, KEY_DURATIONS, writeLog, getDeviceFingerprint, getDeviceName } from "./utils.js";

export async function loginWithPassword(username, password) {
  username = (username || "").trim();
  if (!username || !password) return { ok: false, msg: "Nhập đủ thông tin" };
  if (!db) return { ok: false, msg: "Firebase chưa khởi tạo" };

  let snap;
  try {
    snap = await get(ref(db, `accounts/${username}`));
  } catch (e) {
    return { ok: false, msg: "Không đọc được DB: " + e.message };
  }

  if (!snap.exists()) return { ok: false, msg: "Tài khoản không tồn tại" };
  const acc = snap.val();
  if (acc.password !== password) return { ok: false, msg: "Sai mật khẩu" };

  return finishLogin(acc, username);
}

export async function loginWithKey(key) {
  key = (key || "").trim();
  if (!key) return { ok: false, msg: "Nhập private key" };
  if (!db) return { ok: false, msg: "Firebase chưa khởi tạo" };

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

    // Kích hoạt lần đầu
    if (!kData.activatedAt) {
      const now = Math.floor(Date.now() / 1000);
      await update(ref(db, `keys/${key}`), { activatedAt: now });
      kData.activatedAt = now;
    }

    // ====== LOGIC KIỂM TRA THIẾT BỊ ======
    const fingerprint = getDeviceFingerprint();
    const deviceName = getDeviceName();
    
    // Nếu là key mới tinh (chưa có mảng devices), khởi tạo mảng rỗng
    let devices = kData.devices || [];
    
    // Kiểm tra xem thiết bị này đã đăng nhập chưa
    const isDeviceExist = devices.some(d => d.fingerprint === fingerprint);

    if (!isDeviceExist) {
      // Nếu thiết bị mới, kiểm tra xem đã đạt giới hạn chưa
      const maxDevices = kData.maxDevices === -1 ? Infinity : (kData.maxDevices || 1); // Mặc định 1 nếu không set
      if (devices.length >= maxDevices) {
        return { ok: false, msg: `Key đã đạt giới hạn ${maxDevices} thiết bị. Không thể đăng nhập!` };
      }
      
      // Thêm thiết bị mới vào mảng
      const newDevice = {
        fingerprint,
        name: deviceName,
        loginTime: new Date().toISOString()
      };
      devices.push(newDevice);
      
      // Cập nhật lại mảng devices lên Firebase
      await update(ref(db, `keys/${key}`), { devices });
      kData.devices = devices; // Cập nhật lại data local để truyền vào session
    }
    // =====================================

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
