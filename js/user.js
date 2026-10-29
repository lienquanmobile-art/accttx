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
