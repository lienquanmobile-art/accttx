import { ensureOwner, session, toast } from "./utils.js";
import { loginWithPassword, loginWithKey } from "./auth.js";
import { renderAdminTab } from "./owner.js";
import { renderUserGuest } from "./user.js";

/* ===== Render Dashboard ===== */
async function initDashboard(user) {
  const navTabs = document.getElementById("navTabs");
  const navHomeBtn = document.getElementById("navHomeBtn");
  const navAdminBtn = document.getElementById("navAdminBtn");
  const homeView = document.getElementById("homeView");
  const adminView = document.getElementById("adminView");
  const subLogBtn = document.getElementById("subLogBtn");

  // Reset trạng thái an toàn
  if (homeView) { homeView.classList.remove("hidden"); homeView.classList.add("active"); }
  if (adminView) { adminView.classList.add("hidden"); adminView.classList.remove("active"); }

  // Phân quyền hiển thị
  if (navTabs) {
    if (user.role === "owner" || user.role === "admin") {
      navTabs.classList.remove("hidden");
      if (navAdminBtn) navAdminBtn.classList.remove("hidden");
      
      if (subLogBtn) {
        if (user.role === "admin") subLogBtn.classList.add("hidden");
        else subLogBtn.classList.remove("hidden");
      }
    } else {
      navTabs.classList.add("hidden");
    }
  }

  // Sự kiện chuyển Tab
  if (navHomeBtn && navAdminBtn && homeView && adminView) {
    navHomeBtn.onclick = () => {
      navHomeBtn.classList.add("active");
      navAdminBtn.classList.remove("active");
      homeView.classList.remove("hidden");
      homeView.classList.add("active");
      adminView.classList.add("hidden");
      adminView.classList.remove("active");
    };

    navAdminBtn.onclick = () => {
      navHomeBtn.classList.remove("active");
      navAdminBtn.classList.add("active");
      homeView.classList.add("hidden");
      homeView.classList.remove("active");
      adminView.classList.remove("hidden");
      adminView.classList.add("active");

      const firstSubTab = document.querySelector('[data-sub="create"]');
      if (firstSubTab) firstSubTab.click();
    };
  }

  // Gắn sự kiện cho các Tab Con
  document.querySelectorAll("#adminSubTabs .main-tab").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("#adminSubTabs .main-tab").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      renderAdminTab(btn.dataset.sub, user);
    };
  });

  renderUserGuest(user);
}

/* ===== Khởi tạo ===== */
window.addEventListener("DOMContentLoaded", async () => {
  bindLoginUI();

  try {
    await ensureOwner();
  } catch (e) {
    console.error("❌ ensureOwner error:", e);
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
      
      btnPass.disabled = true; 
      btnPass.textContent = "Đang đăng nhập...";
      msg.className = "msg"; 
      msg.textContent = "";
      
      try {
        const res = await loginWithPassword(u, p);
        if (!res.ok) { msg.className = "msg error"; msg.textContent = res.msg; return; }
        showDashboard(res.user);
      } catch (e) {
        msg.className = "msg error"; 
        msg.textContent = "Lỗi: " + e.message;
      } finally {
        btnPass.disabled = false; 
        btnPass.textContent = "Đăng nhập";
      }
    };
  }

  const btnKey = document.getElementById("btnLoginKey");
  if (btnKey) {
    btnKey.onclick = async () => {
      const msg = document.getElementById("loginMsg");
      const k = document.getElementById("loginKey").value.trim();
      
      if (!k) { msg.className = "msg error"; msg.textContent = "Nhập private key"; return; }
      
      btnKey.disabled = true; 
      btnKey.textContent = "Đang kiểm tra...";
      msg.className = "msg"; 
      msg.textContent = "";
      
      try {
        const res = await loginWithKey(k);
        if (!res.ok) { msg.className = "msg error"; msg.textContent = res.msg; return; }
        showDashboard(res.user);
      } catch (e) {
        msg.className = "msg error"; 
        msg.textContent = "Lỗi: " + e.message;
      } finally {
        btnKey.disabled = false; 
        btnKey.textContent = "Đăng nhập bằng Key";
      }
    };
  }

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.onclick = () => { session.clear(); location.reload(); };
  }
}

/* ===== Hiển thị Dashboard ===== */
function showDashboard(user) {
  document.getElementById("loginScreen").classList.remove("active");
  document.getElementById("dashboardScreen").classList.add("active");

  const userLabel = document.getElementById("currentUserLabel");
  if (userLabel) userLabel.textContent = user.username;
  
  const roleBadge = document.getElementById("currentRoleBadge");
  if (roleBadge) {
    roleBadge.textContent = (user.role || "").toUpperCase();
    roleBadge.style.color =
      user.role === "owner" ? "#ff00d4" :
      user.role === "admin" ? "#00f0ff" :
      user.role === "user"  ? "#22c55e" : "#facc15";
  }

  initDashboard(user);
}
