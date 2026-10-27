import { ensureOwner } from "./utils.js";
import { loginWithPassword, loginWithKey } from "./auth.js";
import { session, toast } from "./utils.js";
import { renderDashboard } from "./dashboard-init.js";

/* ===== khởi tạo ===== */
window.addEventListener("DOMContentLoaded", async () => {
  await ensureOwner();
  bindLoginUI();

  const u = session.get();
  if (u) showDashboard(u);
});

/* ===== LOGIN UI ===== */
function bindLoginUI() {
  // Tabs login
  document.querySelectorAll(".ltab").forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll(".ltab").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".login-pane").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      document.getElementById(t.dataset.tab === "pass" ? "loginPassTab" : "loginKeyTab")
        .classList.add("active");
    };
  });

  document.getElementById("btnLoginPass").onclick = async () => {
    const u = document.getElementById("loginUsername").value.trim();
    const p = document.getElementById("loginPassword").value;
    const msg = document.getElementById("loginMsg");
    const res = await loginWithPassword(u, p);
    if (!res.ok) { msg.className = "msg error"; msg.textContent = res.msg; return; }
    msg.textContent = "";
    showDashboard(res.user);
  };

  document.getElementById("btnLoginKey").onclick = async () => {
    const k = document.getElementById("loginKey").value.trim();
    const msg = document.getElementById("loginMsg");
    const res = await loginWithKey(k);
    if (!res.ok) { msg.className = "msg error"; msg.textContent = res.msg; return; }
    msg.textContent = "";
    showDashboard(res.user);
  };

  document.getElementById("btnLogout").onclick = () => {
    session.clear();
    location.reload();
  };
}

/* ===== Hiển thị Dashboard ===== */
function showDashboard(user) {
  document.getElementById("loginScreen").classList.remove("active");
  document.getElementById("dashboardScreen").classList.add("active");

  document.getElementById("currentUserLabel").textContent = user.username;
  const roleBadge = document.getElementById("currentRoleBadge");
  roleBadge.textContent = user.role.toUpperCase();
  roleBadge.style.color =
    user.role === "owner" ? "#ff00d4" :
    user.role === "admin" ? "#00f0ff" :
    user.role === "user"  ? "#22c55e" : "#facc15";

  renderDashboard(user);
}
