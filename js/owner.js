import { db, ref, set, get, remove, onValue, update } from "./firebase-config.js";
import {
  toast, rand8, genGuestKey, genFixedKey, fmtTime, copyText, writeLog,
  KEY_DURATIONS, listenKeys, keyStatus, keyRemain,
} from "./utils.js";

let currentKeys = [];
let unsubKeys = null;

export function renderOwner(user) {
  const tabs = document.getElementById("mainTabs");
  tabs.innerHTML = `
    <button class="main-tab active" data-tab="create">Tạo tài khoản</button>
    <button class="main-tab" data-tab="keys">Key</button>
    <button class="main-tab" data-tab="lq">Thêm tài khoản Liên Quân</button>
    <button class="main-tab" data-tab="cs">Thêm tài khoản Chung sức</button>
    <button class="main-tab" data-tab="log">Log</button>
  `;
  tabs.querySelectorAll(".main-tab").forEach((t) => {
    t.onclick = () => {
      tabs.querySelectorAll(".main-tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      renderTab(t.dataset.tab, user);
    };
  });
  renderTab("create", user);
}

function renderTab(tab, user) {
  const box = document.getElementById("adminContent");
  if (tab === "create") box.innerHTML = tabCreateAccount(user);
  if (tab === "keys")   box.innerHTML = tabKeys(user);
  if (tab === "lq")     box.innerHTML = tabLienQuan();
  if (tab === "cs")     box.innerHTML = tabChungSuc();
  if (tab === "log")    box.innerHTML = tabLog();

  if (tab === "create") bindCreateAccount(user);
  if (tab === "keys")   bindKeys(user);
  if (tab === "lq")     bindLienQuan();
  if (tab === "cs")     bindChungSuc();
  if (tab === "log")    bindLog();
}

/* ============ TAB 1: TẠO TÀI KHOẢN ============ */
function tabCreateAccount(user) {
  const onlyUser = user.role === "admin";
  return `
    <div class="panel">
      <h3>Tạo tài khoản mới</h3>
      <label>Loại tài khoản</label>
      <select id="ca_role">
        ${onlyUser ? `<option value="user">User</option>` : `
          <option value="admin">Admin</option>
          <option value="user">User</option>
        `}
      </select>
      <label>Tên đăng nhập</label>
      <input id="ca_username" placeholder="vd: player01" />
      <label>Mật khẩu</label>
      <input id="ca_password" placeholder="mật khẩu" />
      <button class="btn-neon full" id="ca_create">Tạo</button>
      <div id="ca_result"></div>
    </div>
  `;
}

function bindCreateAccount(user) {
  document.getElementById("ca_create").onclick = async () => {
    const role = document.getElementById("ca_role").value;
    const username = document.getElementById("ca_username").value.trim();
    const password = document.getElementById("ca_password").value;
    if (!username || !password) return toast("Nhập đủ thông tin", "error");

    const exists = await get(ref(db, `accounts/${username}`));
    if (exists.exists()) return toast("Tên đăng nhập đã tồn tại", "error");

    const key = await genFixedKey(role);
    await set(ref(db, `accounts/${username}`), {
      username, password, role, key,
      createdAt: new Date().toISOString(),
    });
    await set(ref(db, `accounts_by_key/${key}`), username);
    await writeLog(user.username, "Tạo tài khoản", `${role}:${username}`);

    document.getElementById("ca_result").innerHTML = `
      <div class="result-box">
        <div class="row"><span>Loại tài khoản</span><span>${role}</span></div>
        <div class="row"><span>Tên đăng nhập</span><span>${username}</span></div>
        <div class="row"><span>Mật khẩu</span><span>${password}</span></div>
        <div class="row"><span>Private key</span><span>${key}</span></div>
        <button class="copy-btn" data-copy="${key}">Sao chép</button>
      </div>
    `;
    document.querySelector("#ca_result .copy-btn").onclick = () => copyText(key);
    toast("Tạo tài khoản thành công", "ok");
  };
}

/* ============ TAB 2: KEYS ============ */
function tabKeys(user) {
  return `
    <div class="sub-tabs">
      <button class="sub-tab active" data-s="create">Tạo Key</button>
      <button class="sub-tab" data-s="list">Danh sách key đã tạo</button>
    </div>
    <div id="keyPaneCreate"></div>
    <div id="keyPaneList" class="hidden"></div>
  `;
}

function bindKeys(user) {
  const box = document.getElementById("adminContent");
  box.querySelectorAll(".sub-tab").forEach((t) => {
    t.onclick = () => {
      box.querySelectorAll(".sub-tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      document.getElementById("keyPaneCreate").classList.toggle("hidden", t.dataset.s !== "create");
      document.getElementById("keyPaneList").classList.toggle("hidden", t.dataset.s !== "list");
    };
  });

  renderKeyCreatePane();
  renderKeyListPane();
}

function renderKeyCreatePane() {
  const pane = document.getElementById("keyPaneCreate");
  pane.innerHTML = `
    <div class="panel">
      <h3>Tạo key khách</h3>
      <label>Tên Key</label>
      <input id="k_name" placeholder="vd: Nguyễn Văn A" />
      <label>Thời gian</label>
      <select id="k_duration">
        <option value="1 phút">1 phút</option>
        <option value="1 giờ">1 giờ</option>
        <option value="24 giờ">24 giờ</option>
        <option value="1 tháng">1 tháng</option>
        <option value="1 năm">1 năm</option>
      </select>
      <label>Số lượng thiết bị</label>
      <select id="k_device">
        <option value="1">1 thiết bị</option>
        <option value="3">3 thiết bị</option>
        <option value="5">5 thiết bị</option>
        <option value="10">10 thiết bị</option>
        <option value="30">30 thiết bị</option>
        <option value="-1">Không giới hạn thiết bị</option>
      </select>
      <button class="btn-neon full" id="k_create">Tạo</button>
      <div id="k_result"></div>
    </div>
  `;

  document.getElementById("k_create").onclick = async () => {
    const name = document.getElementById("k_name").value.trim();
    const duration = document.getElementById("k_duration").value;
    const maxDevices = Number(document.getElementById("k_device").value);
    if (!name) return toast("Nhập tên key", "error");

    const key = await genGuestKey();
    const maxAcc = KEY_DURATIONS[duration].maxAcc;
    await set(ref(db, `keys/${key}`), {
      name, duration, key, maxDevices,
      maxAcc: maxAcc === Infinity ? -1 : maxAcc,
      usedAcc: 0,
      activatedAt: null,
      devices: [], // Mảng lưu thiết bị
      createdAt: new Date().toISOString(),
    });
    await writeLog("owner", "Tạo key khách", `${name} - ${duration} - ${maxDevices} thiết bị`);

    const sec = KEY_DURATIONS[duration].sec;
    document.getElementById("k_result").innerHTML = `
      <div class="result-box">
        <div class="row"><span>Tên Key</span><span>${name}</span></div>
        <div class="row"><span>Thời gian</span><span>${fmtTime(sec)}</span></div>
        <div class="row"><span>Số lượng thiết bị</span><span>${maxDevices === -1 ? "Không giới hạn" : maxDevices}</span></div>
        <div class="row"><span>Private key</span><span>${key}</span></div>
        <button class="copy-btn" data-copy="${key}">Sao chép</button>
      </div>
    `;
    document.querySelector("#k_result .copy-btn").onclick = () => copyText(key);
    toast("Tạo key thành công", "ok");
    renderKeyListPane();
  };
}

function renderKeyListPane() {
  const pane = document.getElementById("keyPaneList");
  pane.innerHTML = `
    <div class="panel">
      <h3>Danh sách key đã tạo</h3>
      <div id="keyListContainer"></div>
    </div>
  `;

  if (unsubKeys) unsubKeys();
  unsubKeys = listenKeys((list) => {
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const container = document.getElementById("keyListContainer");
    if (!container) return;
    if (!list.length) {
      container.innerHTML = `<div style="text-align:center;color:#8ab;padding:20px">Chưa có key nào</div>`;
      return;
    }

    // Render theo đúng cú pháp yêu cầu (dạng khối, có xuống dòng)
    container.innerHTML = list.map((k) => {
      const st = keyStatus(k);
      const remain = keyRemain(k);
      const durSec = KEY_DURATIONS[k.duration]?.sec || 0;
      const maxTxt = k.maxAcc === -1 ? "∞" : k.maxAcc;
      const timeTxt = st === "active" ? fmtTime(remain) : fmtTime(durSec);
      
      const stTxt = st === "inactive" ? "Chưa kích hoạt" : st === "active" ? "Đã kích hoạt" : "Hết hạn";
      const stClass = st === "inactive" ? "inactive" : st === "active" ? "active" : "expired";
      
      const devices = k.devices || [];
      const maxDev = k.maxDevices === -1 ? "∞" : (k.maxDevices || 1);

      return `
        <div class="result-box" style="max-width: 100%; margin-bottom: 16px; position: relative;">
          <div class="row"><span>Tên key :</span><span>${k.name}</span></div>
          <div class="row"><span>Thời gian :</span><span>${timeTxt}</span></div>
          <div class="row"><span>Số lượng thiết bị :</span><span>${devices.length}/${maxDev}</span></div>
          <div class="row"><span>Private key :</span><span style="font-family:monospace">${k.key}</span></div>
          <div class="row"><span>Trạng Thái :</span><span class="status ${stClass}">${stTxt}</span></div>
          
          <div style="margin-top: 12px; border-top: 1px dashed rgba(0,240,255,.3); padding-top: 10px; display: flex; gap: 10px;">
            <button class="copy-btn" data-view-devices="${k.key}" style="margin-top:0;">Xem Thiết Bị</button>
            <button class="copy-btn" style="margin-top:0; border-color:var(--red); color:var(--red);" data-del-key="${k.key}">Xóa Key</button>
          </div>
        </div>
      `;
    }).join("");

    // Xử lý nút Xem Thiết Bị
    container.querySelectorAll("[data-view-devices]").forEach((b) => {
      b.onclick = () => {
        const keyId = b.dataset.viewDevices;
        const keyData = list.find(x => x.key === keyId);
        if (!keyData) return;

        const devs = keyData.devices || [];
        let html = `
          <div class="panel" style="margin-top: 20px;">
            <h3>Thiết bị đã đăng nhập (Key: ${keyId})</h3>
            <table>
              <thead><tr><th>Tên Thiết Bị</th><th>Mã Vân Tay</th><th>Thời Gian Đăng Nhập</th></tr></thead>
              <tbody>
        `;
        if (!devs.length) {
          html += `<tr><td colspan="3" style="text-align:center;color:#8ab">Chưa có thiết bị nào đăng nhập</td></tr>`;
        } else {
          html += devs.map(d => `
            <tr>
              <td>${d.name}</td>
              <td style="font-family:monospace;color:#8ab">${d.fingerprint}</td>
              <td>${new Date(d.loginTime).toLocaleString("vi-VN")}</td>
            </tr>
          `).join("");
        }
        html += `</tbody></table></div>`;
        
        // Xóa bảng cũ (nếu có) và chèn bảng mới
        const oldTable = document.getElementById("deviceTableContainer");
        if (oldTable) oldTable.remove();
        
        const div = document.createElement("div");
        div.id = "deviceTableContainer";
        div.innerHTML = html;
        container.appendChild(div);
      };
    });

    // Xử lý nút Xóa Key
    container.querySelectorAll("[data-del-key]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Bạn có chắc chắn muốn xóa key này? Khách đang dùng sẽ bị văng ra.")) return;
        await remove(ref(db, `keys/${b.dataset.delKey}`));
        await writeLog("owner", "Xóa key khách", b.dataset.delKey);
        toast("Đã xóa key", "ok");
      };
    });
  });
}

/* ============ TAB 3: LIÊN QUÂN ============ */
function tabLienQuan() {
  return `
    <div class="panel">
      <h3>Thêm tài khoản Liên Quân</h3>
      <div class="form-row">
        <input id="lq_user" placeholder="Tên tài khoản" />
        <input id="lq_pass" placeholder="Mật khẩu" />
        <input id="lq_tuong" type="number" placeholder="Số tướng" />
        <input id="lq_skin" type="number" placeholder="Số skin" />
      </div>
      <button class="btn-neon full" id="lq_add">Thêm</button>
    </div>
    <div class="panel">
      <h3>Danh sách tài khoản đã thêm</h3>
      <table>
        <thead>
          <tr><th>Tên TK</th><th>Mật khẩu</th><th>Số tướng</th><th>Số skin</th><th>Trạng thái</th><th>Hành động</th></tr>
        </thead>
        <tbody id="lqBody"></tbody>
      </table>
    </div>
  `;
}

function bindLienQuan() {
  document.getElementById("lq_add").onclick = async () => {
    const username = document.getElementById("lq_user").value.trim();
    const password = document.getElementById("lq_pass").value;
    const tuong = Number(document.getElementById("lq_tuong").value) || 0;
    const skin = Number(document.getElementById("lq_skin").value) || 0;
    if (!username || !password) return toast("Nhập đủ thông tin", "error");

    const id = Date.now() + "_" + rand8();
    await set(ref(db, `lienquan/${id}`), {
      username, password, tuong, skin, 
      status: "open", // Mặc định luôn là Mở
      createdAt: new Date().toISOString(),
    });
    await writeLog("owner", "Thêm acc Liên Quân", username);
    toast("Đã thêm", "ok");
    ["lq_user","lq_pass","lq_tuong","lq_skin"].forEach((i) => document.getElementById(i).value = "");
  };

  onValue(ref(db, "lienquan"), (snap) => {
    const body = document.getElementById("lqBody");
    if (!body) return;
    const data = snap.val() || {};
    const list = Object.entries(data);
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#8ab">Chưa có acc</td></tr>`;
      return;
    }
    body.innerHTML = list.map(([id, a]) => {
      const isOpen = a.status === "open";
      const statusText = isOpen ? "Mở" : "Khóa";
      const btnToggleText = isOpen ? "Khóa" : "Mở";
      const btnToggleClass = isOpen ? "btn-lock" : "btn-open";
      
      return `
      <tr>
        <td>${a.username}</td>
        <td>${a.password}</td>
        <td>${a.tuong}</td>
        <td>${a.skin}</td>
        <td><span class="status ${isOpen ? "open" : "locked"}">${statusText}</span></td>
        <td>
          <button class="copy-btn ${btnToggleClass}" data-toggle="${id}" data-current="${a.status}">${btnToggleText}</button>
          <button class="copy-btn" style="border-color:var(--red); color:var(--red);" data-del="${id}">Xóa</button>
        </td>
      </tr>
    `}).join("");

    body.querySelectorAll("[data-toggle]").forEach((b) => {
      b.onclick = async () => {
        const id = b.dataset.toggle;
        const current = b.dataset.current;
        const newStatus = current === "open" ? "locked" : "open";
        await update(ref(db, `lienquan/${id}`), { status: newStatus });
        await writeLog("owner", "Đổi trạng thái LQ", `${id} -> ${newStatus}`);
        toast(`Đã chuyển sang ${newStatus === "open" ? "Mở" : "Khóa"}`, "ok");
      };
    });

    body.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Bạn có chắc chắn muốn xóa acc này?")) return;
        await remove(ref(db, `lienquan/${b.dataset.del}`));
        await writeLog("owner", "Xóa acc Liên Quân", b.dataset.del);
        toast("Đã xóa", "ok");
      };
    });
  });
}

/* ============ TAB 4: CHUNG SỨC ============ */
function tabChungSuc() {
  return `
    <div class="panel">
      <h3>Thêm tài khoản Chung sức</h3>
      <div class="form-row">
        <input id="cs_user" placeholder="Tên tài khoản" />
        <input id="cs_pass" placeholder="Mật khẩu" />
      </div>
      <button class="btn-neon full" id="cs_add">Thêm</button>
    </div>
    <div class="panel">
      <h3>Danh sách tài khoản đã thêm</h3>
      <table>
        <thead><tr><th>Tên TK</th><th>Mật khẩu</th><th></th></tr></thead>
        <tbody id="csBody"></tbody>
      </table>
    </div>
  `;
}

function bindChungSuc() {
  document.getElementById("cs_add").onclick = async () => {
    const username = document.getElementById("cs_user").value.trim();
    const password = document.getElementById("cs_pass").value;
    if (!username || !password) return toast("Nhập đủ thông tin", "error");
    const id = Date.now() + "_" + rand8();
    await set(ref(db, `chungsuc/${id}`), { username, password, createdAt: new Date().toISOString() });
    await writeLog("owner", "Thêm acc Chung sức", username);
    toast("Đã thêm", "ok");
    document.getElementById("cs_user").value = "";
    document.getElementById("cs_pass").value = "";
  };

  onValue(ref(db, "chungsuc"), (snap) => {
    const body = document.getElementById("csBody");
    if (!body) return;
    const data = snap.val() || {};
    const list = Object.entries(data);
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#8ab">Chưa có acc</td></tr>`;
      return;
    }
    body.innerHTML = list.map(([id, a]) => `
      <tr>
        <td>${a.username}</td><td>${a.password}</td>
        <td><button class="copy-btn" style="border-color:var(--red); color:var(--red);" data-del="${id}">Xóa</button></td>
      </tr>
    `).join("");
    body.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Bạn có chắc chắn muốn xóa acc này?")) return;
        await remove(ref(db, `chungsuc/${b.dataset.del}`));
        toast("Đã xóa", "ok");
      };
    });
  });
}

/* ============ TAB 5: LOG ============ */
function tabLog() {
  return `
    <div class="panel">
      <h3>Lịch sử hành động</h3>
      <table>
        <thead><tr><th>Thời gian</th><th>Tài khoản</th><th>Hành động</th><th>Chi tiết</th></tr></thead>
        <tbody id="logBody"></tbody>
      </table>
    </div>
  `;
}

function bindLog() {
  onValue(ref(db, "logs"), (snap) => {
    const body = document.getElementById("logBody");
    if (!body) return;
    const data = snap.val() || {};
    const list = Object.entries(data).sort((a, b) => b[0].localeCompare(a[0]));
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#8ab">Chưa có log</td></tr>`;
      return;
    }
    body.innerHTML = list.slice(0, 200).map(([_, l]) => `
      <tr>
        <td>${new Date(l.time).toLocaleString("vi-VN")}</td>
        <td>${l.actor}</td>
        <td>${l.action}</td>
        <td>${l.detail || ""}</td>
      </tr>
    `).join("");
  });
}
