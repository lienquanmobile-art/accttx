import { renderOwner } from "./owner.js";
import { renderAdmin } from "./admin.js";
import { renderUserGuest } from "./user.js";

export function renderDashboard(user) {
  document.getElementById("mainTabs").classList.add("hidden");
  document.getElementById("adminContent").classList.add("hidden");
  document.getElementById("userContent").classList.add("hidden");

  if (user.role === "owner") {
    document.getElementById("mainTabs").classList.remove("hidden");
    document.getElementById("adminContent").classList.remove("hidden");
    renderOwner(user);
  } else if (user.role === "admin") {
    document.getElementById("mainTabs").classList.remove("hidden");
    document.getElementById("adminContent").classList.remove("hidden");
    renderAdmin(user);
  } else {
    // user / guest
    document.getElementById("userContent").classList.remove("hidden");
    renderUserGuest(user);
  }
}
