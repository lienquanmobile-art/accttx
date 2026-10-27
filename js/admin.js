import { renderOwner } from "./owner.js";

/* Admin dùng lại gần hết logic của Owner, chỉ khác:
   - Chỉ được tạo User
   - Không có tab Log
   Ta override tabs và ẩn Log sau khi render. */
export function renderAdmin(user) {
  renderOwner({ ...user, role: "admin" });

  // Xóa tab Log khỏi UI admin
  setTimeout(() => {
    const logTab = document.querySelector('.main-tab[data-tab="log"]');
    if (logTab) logTab.remove();
    // Nếu đang active log thì chuyển về create
    const active = document.querySelector(".main-tab.active");
    if (!active) document.querySelector('.main-tab[data-tab="create"]')?.click();
  }, 0);
}
