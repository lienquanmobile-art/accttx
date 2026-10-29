import { db, ref, get, remove } from "./firebase-config.js";
import { toast, fmtTime, keyRemain, KEY_DURATIONS, writeLog } from "./utils.js";

let timerId = null;

export function renderUserGuest(user) {
  console.log("👤 [renderUserGuest] role =", user.role);

  // Timer key khách (chỉ áp dụng cho khách)
  const timerEl = document.getElementById("keyTimer");
  if (timerId) clearInterval(timerId);

  if (timerEl) {
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
  }

  // GẮN SỰ KIỆN CHO NÚT NHẬN ACC
  const btn = document.getElementById("btnGetAccount");
  if (!btn) {
    console.error("❌ Không tìm thấy #btnGetAccount");
    return;
  }

  // Đảm bảo nút không bị vô hiệu hóa
  btn.disabled = false;
  btn.removeAttribute("disabled");
  btn.style.pointerEvents = "auto";
  btn.onclick = null; // Xóa onclick cũ

  btn.addEventListener("click", () => {
    console.log("🖱️ [btnGetAccount] CLICK!");
    claimAccount(user);
  });
  
  console.log("✅ Đã gắn sự kiện click vào nút Nhận Acc");
}

/* ===== Nhận acc ===== */
async function claimAccount(user) {
  console.log("🎯 [claimAccount] Bắt đầu, user =", user);

  const btn = document.getElementById("btnGetAccount");
  const box = document.getElementById("receivedAccBox");

  btn.disabled = true;
  btn.textContent = "⏳ Đang lấy...";

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
        toast("Key đã hết hạn", "error"); return;
      }
      const max = k.maxAcc === -1 ? Infinity : (k.maxAcc || 0);
      if ((k.usedAcc || 0) >= max) {
        toast(`Key đã đạt giới hạn ${max} acc`, "error"); return;
      }
    }

    // 2) Lấy danh sách acc
    const allSnap = await get(ref(db, "lienquan"));
    if (!allSnap.exists()) {
      toast("⚠️ Kho acc trống", "error");
      return;
    }
    const all = allSnap.val() || {};
    const openList = Object.entries(all).filter(([_, a]) => a && a.status === "open");
    
    if (openList.length === 0) {
      toast("⚠️ Không có acc nào ở trạng thái Mở", "error");
      return;
    }

    // 3) Random
    const picked = openList[Math.floor(Math.random() * openList.length)];
    const [id, acc] = picked;

    // 4) Xóa acc
    await remove(ref(db, `lienquan/${id}`));

    // 5) Tăng usedAcc (dùng update trực tiếp)
    if (keyPath) {
      try {
        const kSnap2 = await get(ref(db, keyPath));
        if (kSnap2.exists()) {
          const newUsed = (kSnap2.val().usedAcc || 0) + 1;
          const { update } = await import("./firebase-config.js");
          await update(ref(db, keyPath), { usedAcc: newUsed });
        }
      } catch (e) { console.error("Update usedAcc lỗi:", e); }
    }

    // 6) Log
    try { await writeLog(user.username, "Nhận acc", `${acc.username} (${id})`); } catch {}

    // 7) Hiển thị
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
    console.error("❌ [claimAccount] Lỗi:", e);
    toast("❌ Lỗi: " + (e.message || "Không xác định"), "error");
  } finally {
    btn.disabled = false;
    btn.removeAttribute("disabled");
    btn.textContent = "🎁 NHẬN ACC";
    console.log("🔓 [claimAccount] Đã bật lại nút");
  }
}
