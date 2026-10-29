import { ensureOwner, session, toast } from "./utils.js";
import { loginWithPassword, loginWithKey } from "./auth.js";
import { renderAdminTab } from "./owner.js";
import { renderUserGuest } from "./user.js";

/* ===== Render Dashboard ===== */
async function initDashboard(user) {
  const homeContent = document.getElementById("homeContent");
  const adminContent = document.getElementById("adminContent");
  const adminMenuContainer = document.getElementById("adminMenuContainer");
  const menuLog = document.getElementById("menuLog");

  // Reset
  homeContent.classList.remove("hidden");
  homeContent.classList.add("active");
  adminContent.classList.add("hidden");
  adminContent.classList.remove("active");
  document.getElementById("receivedAccBox").classList.add("hidden");

  // Phân quyền hiển thị Menu
  if (user.role === "owner" || user.role === "admin") {
    adminMenuContainer.classList.remove("hidden");
    if (user.role === "admin") {
      menuLog.style.display = "none"; // Admin không có Log
    } else {
      menuLog.style.display = "block";
    }
  } else {
    adminMenuContainer.classList.add("hidden"); // User/Khách không có menu
  }

  // Gắn sự kiện click vào menu
  document.querySelectorAll("#adminDropdown a").forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      
      // Đổi trạng thái active
      homeContent.classList.add("hidden");
      homeContent.classList.remove("active");
      adminContent.classList.remove("hidden");
      adminContent.classList.add("active");

      // Render nội dung tương ứng vào adminContent
      renderAdminTab(tab, user);
    };
  });

  // Bấm vào Logo để về Trang Chủ
  document.getElementById("btnHomeLogo").onclick = () => {
    adminContent.classList.add("hidden");
    adminContent.classList.remove("active");
    homeContent.classList.remove("hidden");
    homeContent.classList.add("active");
  };

  // Khởi tạo chức năng Nhận Acc (dùng chung cho mọi Role)
  renderUserGuest(user);
}

/* ===== Khởi tạo ===== */
window.addEventListener("DOMContentLoaded", async () => {
  bindLoginUI();

  try {
    await ensureOwner();
  } catch (e) {
    console.error("❌ [app] ensureOwner error:", e);
    toast("Không kết nối được Firebase", "error");
  }

  const u = session.get();
  if (u) showDashboard(u);
});

/* ===== LOGIN UI ===== */
function bindLoginUI() {
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

  const btnPass = document.getElementById("btnLoginPass");
  if (btnPass) {
    btnPass.onclick = async () => {
      const msg = document.getElementById("loginMsg");
      const u = document.getElementById("loginUsername").value.trim();
      const p = document.getElementById("loginPassword").value;
      if (!u || !p) { msg.className = "msg error"; msg.textContent = "Nhập đủ thông tin"; return; }
      btnPass.disabled = true; btnPass.textContent = "Đang đăng nhập...";
      msg.className = "msg"; msg.textContent = "";
      try {
        const res = await loginWithPassword(u, p);
        if (!res.ok) { msg.className = "msg error"; msg.textContent = res.msg; return; }
        showDashboard(res.user);
      } catch (e) {
        msg.className = "msg error"; msg.textContent = "Lỗi: " + e.message;
      } finally {
        btnPass.disabled = false; btnPass.textContent = "Đăng nhập";
      }
    };
  }

  const btnKey = document.getElementById("btnLoginKey");
  if (btnKey) {
    btnKey.onclick = async () => {
      const msg = document.getElementById("loginMsg");
      const k = document.getElementById("loginKey").value.trim();
      if (!k) { msg.className = "msg error"; msg.textContent = "Nhập key"; return; }
      btnKey.disabled = true; btnKey.textContent = "Đang kiểm tra...";
      msg.className = "msg"; msg.textContent = "";
      try {
        const res = await loginWithKey(k);
        if (!res.ok) { msg.className = "msg error"; msg.textContent = res.msg; return; }
        showDashboard(res.user);
      } catch (e) {
        msg.className = "msg error"; msg.textContent = "Lỗi: " + e.message;
      } finally {
        btnKey.disabled = false; btnKey.textContent = "Đăng nhập bằng Key";
      }
    };
  }

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.onclick = () => { session.clear(); location.reload(); };
  }

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

  initDashboard(user);
}
