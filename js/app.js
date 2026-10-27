import { ensureOwner, session, toast } from "./utils.js";
import { loginWithPassword, loginWithKey } from "./auth.js";

/* ===== Điều phối render dashboard (inline — không cần file riêng) ===== */
async function renderDashboard(user) {
  const mainTabs = document.getElementById("mainTabs");
  const adminContent = document.getElementById("adminContent");
  const userContent = document.getElementById("userContent");

  mainTabs.classList.add("hidden");
  adminContent.classList.add("hidden");
  userContent.classList.add("hidden");

  try {
    if (user.role === "owner" || user.role === "admin") {
      const { renderOwner } = await import("./owner.js");
      mainTabs.classList.remove("hidden");
      adminContent.classList.remove("hidden");
      renderOwner(user);
    } else {
      const { renderUserGuest } = await import("./user.js");
      userContent.classList.remove("hidden");
      renderUserGuest(user);
    }
  } catch (e) {
    console.error("❌ Lỗi render dashboard:", e);
    toast("Lỗi tải giao diện: " + e.message, "error");
  }
}

/* ===== Khởi tạo ===== */
window.addEventListener("DOMContentLoaded", async () => {
  // Gắn UI login trước — luôn hoạt động dù Firebase lỗi
  bindLoginUI();

  // Seed owner (nếu Firebase lỗi chỉ log, không chặn UI)
  try {
    await ensureOwner();
  } catch (e) {
    console.error("❌ ensureOwner lỗi:", e);
    toast("Không kết nối được Firebase — kiểm tra databaseURL", "error");
  }

  // Khôi phục session cũ
  const u = session.get();
  if (u) showDashboard(u);
});

/* ===== LOGIN UI ===== */
function bindLoginUI() {
  // Tabs login (dùng event delegation cho chắc)
  const tabBar = document.querySelector(".login-tabs");
  if (tabBar) {
    tabBar.addEventListener("click", (ev) => {
      const t = ev.target.closest(".ltab");
      if (!t) return;
      document.querySelectorAll(".ltab").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".login-pane").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      const pane = document.getElementById(t.dataset.tab === "pass" ? "loginPassTab" : "loginKeyTab");
      if (pane) pane.classList.add("active");
    });
  }

  // Nút login bằng mật khẩu
  const btnPass = document.getElementById("btnLoginPass");
  if (btnPass) {
    btnPass.onclick = async () => {
      const msg = document.getElementById("loginMsg");
      const u = document.getElementById("loginUsername").value.trim();
      const p = document.getElementById("loginPassword").value;

      if (!u || !p) {
        msg.className = "msg error";
        msg.textContent = "Nhập đủ tên đăng nhập và mật khẩu";
        return;
      }

      btnPass.disabled = true;
      btnPass.textContent = "Đang đăng nhập...";
      msg.className = "msg";
      msg.textContent = "";

      try {
        const res = await loginWithPassword(u, p);
        if (!res.ok) {
          msg.className = "msg error";
          msg.textContent = res.msg;
          return;
        }
        showDashboard(res.user);
      } catch (e) {
        console.error(e);
        msg.className = "msg error";
        msg.textContent = "Lỗi kết nối: " + e.message;
      } finally {
        btnPass.disabled = false;
        btnPass.textContent = "Đăng nhập";
      }
    };
  }

  // Nút login bằng key
  const btnKey = document.getElementById("btnLoginKey");
  if (btnKey) {
    btnKey.onclick = async () => {
      const msg = document.getElementById("loginMsg");
      const k = document.getElementById("loginKey").value.trim();
      if (!k) {
        msg.className = "msg error";
        msg.textContent = "Nhập private key";
        return;
      }

      btnKey.disabled = true;
      btnKey.textContent = "Đang kiểm tra...";
      msg.className = "msg";
      msg.textContent = "";

      try {
        const res = await loginWithKey(k);
        if (!res.ok) {
          msg.className = "msg error";
          msg.textContent = res.msg;
          return;
        }
        showDashboard(res.user);
      } catch (e) {
        console.error(e);
        msg.className = "msg error";
        msg.textContent = "Lỗi kết nối: " + e.message;
      } finally {
        btnKey.disabled = false;
        btnKey.textContent = "Đăng nhập bằng Key";
      }
    };
  }

  // Logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.onclick = () => {
      session.clear();
      location.reload();
    };
  }

  // Enter để submit nhanh
  const inputPass = document.getElementById("loginPassword");
  if (inputPass) inputPass.addEventListener("keydown", (e) => { if (e.key === "Enter") btnPass?.click(); });
  const inputKey = document.getElementById("loginKey");
  if (inputKey) inputKey.addEventListener("keydown", (e) => { if (e.key === "Enter") btnKey?.click(); });
}

/* ===== Hiển thị Dashboard ===== */
function showDashboard(user) {
  document.getElementById("loginScreen").classList.remove("active");
  document.getElementById("dashboardScreen").classList.add("active");

  document.getElementById("currentUserLabel").textContent = user.username;

  const roleBadge = document.getElementById("currentRoleBadge");
  roleBadge.textContent = (user.role || "").toUpperCase();
  roleBadge.style.color =
    user.role === "owner" ? "#ff00d4" :
    user.role === "admin" ? "#00f0ff" :
    user.role === "user"  ? "#22c55e" : "#facc15";

  renderDashboard(user);
}
