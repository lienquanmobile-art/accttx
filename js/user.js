import { db, ref, get, remove } from "./firebase-config.js";
import { toast, fmtTime, keyRemain, KEY_DURATIONS, writeLog } from "./utils.js";

let timerId = null;

export function renderUserGuest(user) {
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

  const btn = document.getElementById("btnGetAccount");
  if (!btn) return;

  btn.disabled = false;
  btn.removeAttribute("disabled");
  btn.style.pointerEvents = "auto";
  btn.onclick = null;

  btn.addEventListener("click", () => {
    claimAccount(user);
  });
}

async function claimAccount(user) {
  const btn = document.getElementById("btnGetAccount");
  const box = document.getElementById("receivedAccBox");

  btn.disabled = true;
  btn.textContent = "⏳ Đang lấy...";

  try {
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

    const picked = openList[Math.floor(Math.random() * openList.length)];
    const [id, acc] = picked;

    await remove(ref(db, `lienquan/${id}`));

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

    try { await writeLog(user.username, "Nhận acc", `${acc.username} (${id})`); } catch {}

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
  }
}
