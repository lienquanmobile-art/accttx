import { db, ref, get, runTransaction } from "./firebase-config.js";
import { toast, fmtTime, keyRemain, KEY_DURATIONS, writeLog } from "./utils.js";

let timerId = null;

export function renderUserGuest(user) {
  // Timer key khách
  const timerEl = document.getElementById("keyTimer");
  timerId && clearInterval(timerId);

  if (user.role === "guest" && user.guestKey) {
    timerEl.classList.remove("hidden");
    const refresh = async () => {
      // Đọc lại key mới nhất từ DB
      const snap = await get(ref(db, `keys/${user.key}`));
      if (!snap.exists()) { timerEl.textContent = "Key: Hết hạn"; return; }
      const k = snap.val();
      const remain = keyRemain(k);
      timerEl.textContent = "Key: " + fmtTime(remain);
      if (remain <= 0) {
        clearInterval(timerId);
        toast("Key đã hết hạn", "error");
        setTimeout(() => { sessionStorage.clear(); location.reload(); }, 1500);
      }
    };
    refresh();
    timerId = setInterval(refresh, 1000);
  } else {
    timerEl.classList.add("hidden");
  }

  // Bind nút nhận acc
  const btn = document.getElementById("btnGetAccount");
  btn.onclick = () => claimAccount(user);
}

/* ===== Nhận acc cộng đồng ===== */
async function claimAccount(user) {
  const btn = document.getElementById("btnGetAccount");
  btn.disabled = true;

  try {
    // 1) Nếu là khách: kiểm tra hạn mức
    let keyRefPath = null;
    if (user.role === "guest") {
      keyRefPath = `keys/${user.key}`;
      const kSnap = await get(ref(db, keyRefPath));
      if (!kSnap.exists()) return toast("Key không tồn tại hoặc đã hết hạn", "error");
      const k = kSnap.val();

      const dur = KEY_DURATIONS[k.duration]?.sec || 0;
      if (k.activatedAt && Date.now() / 1000 >= k.activatedAt + dur) {
        return toast("Key đã hết hạn", "error");
      }
      const max = k.maxAcc === -1 ? Infinity : k.maxAcc;
      if ((k.usedAcc || 0) >= max) {
        return toast(`Key đã đạt giới hạn ${max} acc`, "error");
      }
    }

    // 2) Lấy random acc mở trong /lienquan
    const allSnap = await get(ref(db, "lienquan"));
    const all = allSnap.val() || {};
    const openList = Object.entries(all).filter(([_, a]) => a.status === "open");
    if (!openList.length) return toast("Hiện không có acc mở", "error");

    const picked = openList[Math.floor(Math.random() * openList.length)];
    const [id, acc] = picked;

    // 3) Xóa acc khỏi DB (transaction để chắc chắn không trùng)
    const removed = await new Promise((resolve) => {
      runTransaction(ref(db, `lienquan/${id}`), (cur) => {
        if (!cur || cur.status !== "open") return; // abort -> undefined
        return null; // xóa
      }, (err, committed) => resolve(!err && committed));
    });
    if (!removed) { btn.disabled = false; return claimAccount(user); }

    // 4) Tăng usedAcc nếu là khách
    if (keyRefPath) {
      await runTransaction(ref(db, keyRefPath + "/usedAcc"), (cur) => (cur || 0) + 1);
    }

    await writeLog(user.username, "Nhận acc", `${acc.username} (${id})`);

    // 5) Hiện kết quả
    const box = document.getElementById("receivedAccBox");
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="row"><span>Tên đăng nhập</span><span>${acc.username}</span></div>
      <div class="row"><span>Mật khẩu</span><span>${acc.password}</span></div>
      <div class="row"><span>Số tướng</span><span>${acc.tuong}</span></div>
      <div class="row"><span>Số skin</span><span>${acc.skin}</span></div>
      <div class="row"><span>Trạng thái</span><span>Mở</span></div>
      <p class="note">Lưu ý: Nếu acc bị khóa LH 0942.836.367</p>
    `;
    toast("Nhận acc thành công", "ok");
  } catch (e) {
    console.error(e);
    toast("Có lỗi xảy ra", "error");
  } finally {
    btn.disabled = false;
  }
}
