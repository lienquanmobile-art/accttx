import { db, ref, get, runTransaction } from "./firebase-config.js";
import { toast, fmtTime, keyRemain, KEY_DURATIONS, writeLog } from "./utils.js";

let timerId = null;

export function renderUserGuest(user) {
  const timerEl = document.getElementById("keyTimer");
  if (timerId) clearInterval(timerId);

  if (user.role === "guest" && user.guestKey) {
    timerEl.classList.remove("hidden");
    const refresh = async () => {
      try {
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
      } catch (e) { console.error(e); }
    };
    refresh();
    timerId = setInterval(refresh, 1000);
  } else {
    timerEl.classList.add("hidden");
  }

  const btn = document.getElementById("btnGetAccount");
  if (btn) btn.onclick = () => claimAccount(user);
}

/* ===== Nhận acc ===== */
async function claimAccount(user) {
  const btn = document.getElementById("btnGetAccount");
  const box = document.getElementById("receivedAccBox");
  if (!btn) return;

  // Reset UI
  btn.disabled = true;
  btn.textContent = "⏳ Đang lấy...";
  if (box) box.classList.add("hidden");

  try {
    // 1) Khách: check hạn mức
    let keyPath = null;
    if (user.role === "guest") {
      keyPath = `keys/${user.key}`;
      const kSnap = await get(ref(db, keyPath));
      if (!kSnap.exists()) { toast("Key không tồn tại hoặc đã hết hạn", "error"); return; }
      const k = kSnap.val();
      const dur = KEY_DURATIONS[k.duration]?.sec || 0;
      if (k.activatedAt && Date.now() / 1000 >= k.activatedAt + dur) {
        toast("Key đã hết hạn", "error");
        return;
      }
      const max = k.maxAcc === -1 ? Infinity : (k.maxAcc || 0);
      if ((k.usedAcc || 0) >= max) {
        toast(`Key đã đạt giới hạn ${max} acc`, "error");
        return;
      }
    }

    // 2) Đọc danh sách acc "Mở"
    const allSnap = await get(ref(db, "lienquan"));
    if (!allSnap.exists()) {
      toast("⚠️ Chưa có tài khoản nào trong kho", "error");
      return;
    }
    const all = allSnap.val() || {};
    const openList = Object.entries(all).filter(([_, a]) => a && a.status === "open");

    if (openList.length === 0) {
      toast("⚠️ Hiện không có acc Mở (tất cả đang Khóa hoặc hết)", "error");
      return;
    }

    // 3) Chọn ngẫu nhiên
    const picked = openList[Math.floor(Math.random() * openList.length)];
    const [id, acc] = picked;

    // 4) Xóa acc khỏi DB bằng transaction (chống trùng)
    let removed = false;
    await new Promise((resolve) => {
      runTransaction(
        ref(db, `lienquan/${id}`),
        (cur) => {
          if (!cur || cur.status !== "open") return; // abort
          return null; // xóa
        },
        (err, committed) => {
          if (err) console.error("Transaction error:", err);
          removed = !err && committed === true;
          resolve();
        }
      );
    });

    if (!removed) {
      toast("Acc vừa bị người khác lấy, thử lại...", "error");
      // Đệ quy thử lại 1 lần
      return claimAccount(user);
    }

    // 5) Tăng usedAcc cho khách
    if (keyPath) {
      try {
        await runTransaction(ref(db, keyPath + "/usedAcc"), (cur) => (cur || 0) + 1);
      } catch (e) { console.error("Update usedAcc lỗi:", e); }
    }

    // 6) Log
    try { await writeLog(user.username, "Nhận acc", `${acc.username} (${id})`); } catch {}

    // 7) Hiển thị kết quả
    if (box) {
      box.classList.remove("hidden");
      box.innerHTML = `
        <div class="row"><span>Tên đăng nhập</span><span>${acc.username}</span></div>
        <div class="row"><span>Mật khẩu</span><span>${acc.password}</span></div>
        <div class="row"><span>Số tướng</span><span>${acc.tuong ?? 0}</span></div>
        <div class="row"><span>Số skin</span><span>${acc.skin ?? 0}</span></div>
        <div class="row"><span>Trạng thái</span><span>Mở</span></div>
        <p class="note">⚠️ Lưu ý: Nếu acc bị khóa LH 0942.836.367</p>
      `;
    }
    toast("✅ Nhận acc thành công!", "ok");

  } catch (e) {
    console.error("claimAccount error:", e);
    toast("❌ Lỗi: " + (e.message || "Không xác định"), "error");
  } finally {
    // LUÔN bật lại nút, kể cả khi lỗi
    btn.disabled = false;
    btn.textContent = "🎁 NHẬN ACC";
  }
}
