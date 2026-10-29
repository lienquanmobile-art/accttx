import { ensureOwner, session, toast } from "./utils.js";
import { loginWithPassword, loginWithKey } from "./auth.js";
import { renderAdminTab } from "./owner.js";
import { renderUserGuest } from "./user.js";
import { db, ref, push, onValue, set, remove, onDisconnect, get, update } from "./firebase-config.js";

/* ===== Biến toàn cục cho Chat ===== */
let currentRoomId = null; // null = Chat Chung
let currentRoomName = "Chat Chung";
let chatUnsubscribe = null;
let roomUnsubscribe = null;

/* ===== Render Dashboard ===== */
async function initDashboard(user) {
  const navAccBtn = document.getElementById("navAccBtn");
  const navChatBtn = document.getElementById("navChatBtn");
  const navAdminBtn = document.getElementById("navAdminBtn");
  const accView = document.getElementById("accView");
  const chatView = document.getElementById("chatView");
  const adminView = document.getElementById("adminView");
  const subLogBtn = document.getElementById("subLogBtn");

  // Reset giao diện
  accView.classList.remove("hidden"); accView.classList.add("active");
  chatView.classList.add("hidden"); chatView.classList.remove("active");
  adminView.classList.add("hidden"); adminView.classList.remove("active");
  navAccBtn.classList.add("active");
  navChatBtn.classList.remove("active");
  navAdminBtn.classList.remove("active");

  // Phân quyền
  if (user.role === "owner" || user.role === "admin") {
    navAdminBtn.classList.remove("hidden");
    if (user.role === "admin") subLogBtn.classList.add("hidden");
    else subLogBtn.classList.remove("hidden");
  } else {
    navAdminBtn.classList.add("hidden");
  }

  // Sự kiện chuyển Tab
  navAccBtn.onclick = () => {
    navAccBtn.classList.add("active"); navChatBtn.classList.remove("active"); navAdminBtn.classList.remove("active");
    accView.classList.remove("hidden"); accView.classList.add("active");
    chatView.classList.add("hidden"); chatView.classList.remove("active");
    adminView.classList.add("hidden"); adminView.classList.remove("active");
    leaveRoom(user); // Thoát phòng nếu đang chat
  };

  navChatBtn.onclick = () => {
    navChatBtn.classList.add("active"); navAccBtn.classList.remove("active"); navAdminBtn.classList.remove("active");
    chatView.classList.remove("hidden"); chatView.classList.add("active");
    accView.classList.add("hidden"); accView.classList.remove("active");
    adminView.classList.add("hidden"); adminView.classList.remove("active");
    showChatMenu(); // Quay về menu chat
  };

  navAdminBtn.onclick = () => {
    navAdminBtn.classList.add("active"); navAccBtn.classList.remove("active"); navChatBtn.classList.remove("active");
    adminView.classList.remove("hidden"); adminView.classList.add("active");
    accView.classList.add("hidden"); accView.classList.remove("active");
    chatView.classList.add("hidden"); chatView.classList.remove("active");
    leaveRoom(user); // Thoát phòng nếu đang chat

    // Load tab mặc định
    const firstSubTab = document.querySelector('[data-sub="create"]');
    if (firstSubTab) firstSubTab.click();
  };

  // Sự kiện cho các tab con trong Quản Lí
  document.querySelectorAll("#adminSubTabs .main-tab").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("#adminSubTabs .main-tab").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      renderAdminTab(btn.dataset.sub, user);
    };
  });

  // Khởi tạo chức năng Nhận Acc
  renderUserGuest(user);

  // Khởi tạo giao diện Chat
  initChatUI(user);
}

/* ===== LOGIC CHAT ===== */
function initChatUI(user) {
  const btnChatGlobal = document.getElementById("btnChatGlobal");
  const btnJoinRoom = document.getElementById("btnJoinRoom");
  const btnCreateRoom = document.getElementById("btnCreateRoom");
  
  const modalJoin = document.getElementById("modalJoinRoom");
  const modalCreate = document.getElementById("modalCreateRoom");

  // 1. Chat Chung
  btnChatGlobal.onclick = () => enterRoom("global", "Chat Chung", user);

  // 2. Modal Nhập ID
  btnJoinRoom.onclick = () => {
    modalJoin.classList.remove("hidden");
    document.getElementById("inputJoinRoomId").value = "";
    document.getElementById("inputJoinRoomId").focus();
  };
  document.getElementById("btnCancelJoin").onclick = () => modalJoin.classList.add("hidden");
  document.getElementById("btnConfirmJoin").onclick = async () => {
    const id = document.getElementById("inputJoinRoomId").value.trim();
    if (!id) return toast("Nhập ID phòng", "error");
    if (!id.startsWith("BLACKCHAT_")) return toast("Sai định dạng mã phòng", "error");
    
    // Kiểm tra phòng có tồn tại không
    const snap = await get(ref(db, `rooms/${id}`));
    if (!snap.exists()) return toast("Phòng không tồn tại hoặc đã bị xóa", "error");
    
    const roomData = snap.val();
    modalJoin.classList.add("hidden");
    enterRoom(id, roomData.name, user);
  };

  // 3. Modal Tạo Phòng
  btnCreateRoom.onclick = () => {
    modalCreate.classList.remove("hidden");
    document.getElementById("inputCreateRoomName").value = "";
    document.getElementById("inputCreateRoomName").focus();
  };
  document.getElementById("btnCancelCreate").onclick = () => modalCreate.classList.add("hidden");
  document.getElementById("btnConfirmCreate").onclick = async () => {
    const name = document.getElementById("inputCreateRoomName").value.trim();
    if (!name) return toast("Nhập tên phòng", "error");

    // Sinh mã phòng BLACKCHAT_xxxxxx (6 số)
    const roomId = "BLACKCHAT_" + Math.floor(100000 + Math.random() * 900000);
    
    // Lưu phòng vào DB
    await set(ref(db, `rooms/${roomId}`), {
      name: name,
      owner: user.username,
      createdAt: Date.now(),
      members: { [user.username]: true }
    });
    
    modalCreate.classList.add("hidden");
    toast(`Đã tạo phòng: ${roomId}`, "ok");
    
    // Hiển thị danh sách phòng
    renderMyRooms(user);
    
    // Tự động vào phòng
    enterRoom(roomId, name, user);
  };
}

/* ===== VÀO PHÒNG CHAT ===== */
async function enterRoom(roomId, roomName, user) {
  document.getElementById("chatMenu").classList.add("hidden");
  document.getElementById("chatInterface").classList.remove("hidden");
  document.getElementById("chatRoomName").textContent = roomName;
  document.getElementById("chatRoomId").textContent = roomId === "global" ? "" : `(ID: ${roomId})`;
  
  currentRoomId = roomId;
  currentRoomName = roomName;

  // Gắn sự kiện Gửi
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  
  // Xóa sự kiện cũ (nếu có)
  chatSendBtn.onclick = null;
  chatInput.onkeydown = null;

  const sendMsg = async () => {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    
    // Lấy màu theo Role
    let color = "#facc15"; // Guest
    if (user.role === "owner") color = "#ff00d4";
    else if (user.role === "admin") color = "#00f0ff";
    else if (user.role === "user") color = "#22c55e";

    const msgRef = push(ref(db, `chats/${roomId}`));
    await set(msgRef, {
      username: user.username,
      role: user.role,
      color: color,
      text: text,
      time: Date.now()
    });
  };

  chatSendBtn.onclick = sendMsg;
  chatInput.onkeydown = (e) => { if (e.key === "Enter") sendMsg(); };

  // Nếu là phòng riêng, cập nhật member
  if (roomId !== "global") {
    await set(ref(db, `rooms/${roomId}/members/${user.username}`), true);
    
    // Xử lý khi user đóng tab / F5 (rời phòng đột ngột)
    const memberRef = ref(db, `rooms/${roomId}/members/${user.username}`);
    onDisconnect(memberRef).remove();
    
    // Lắng nghe số thành viên
    if (roomUnsubscribe) roomUnsubscribe();
    roomUnsubscribe = onValue(ref(db, `rooms/${roomId}`), (snap) => {
      if (!snap.exists()) {
        // Phòng bị xóa -> tự động out
        leaveRoom(user);
        return;
      }
      const data = snap.val();
      const memberCount = data.members ? Object.keys(data.members).length : 0;
      document.getElementById("chatMemberCount").textContent = `(${memberCount} thành viên)`;
      
      // Nếu phòng trống (không còn ai), xóa phòng và xóa tin nhắn
      if (memberCount === 0) {
        remove(ref(db, `rooms/${roomId}`));
        remove(ref(db, `chats/${roomId}`));
      }
    });
  } else {
    document.getElementById("chatMemberCount").textContent = "";
  }

  // Lắng nghe tin nhắn realtime
  if (chatUnsubscribe) chatUnsubscribe();
  chatUnsubscribe = onValue(ref(db, `chats/${roomId}`), (snap) => {
    const data = snap.val() || {};
    const msgs = Object.values(data).sort((a, b) => a.time - b.time);
    const chatMessages = document.getElementById("chatMessages");
    
    chatMessages.innerHTML = msgs.map(m => {
      const isMe = m.username === user.username;
      return `
        <div class="chat-msg-item ${isMe ? "my-msg" : "other-msg"}">
          <div class="chat-msg-name" style="color: ${m.color};">${m.username}</div>
          <div class="chat-msg-text">${m.text}</div>
        </div>
      `;
    }).join("");
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // Gắn sự kiện Thoát
  document.getElementById("btnLeaveRoom").onclick = () => leaveRoom(user);
}

/* ===== RỜI PHÒNG ===== */
async function leaveRoom(user) {
  if (currentRoomId && currentRoomId !== "global") {
    const roomRef = ref(db, `rooms/${currentRoomId}`);
    const snap = await get(roomRef);
    
    if (snap.exists()) {
      const data = snap.val();
      
      // Nếu user là chủ phòng -> Giải tán phòng (xóa toàn bộ)
      if (data.owner === user.username) {
        await remove(roomRef);
        await remove(ref(db, `chats/${currentRoomId}`));
        toast("Đã giải tán phòng chat", "ok");
      } else {
        // Nếu là thành viên thường -> Chỉ xóa tên khỏi danh sách
        await remove(ref(db, `rooms/${currentRoomId}/members/${user.username}`));
        
        // Kiểm tra nếu không còn ai -> Xóa phòng
        const members = data.members || {};
        delete members[user.username];
        if (Object.keys(members).length === 0) {
          await remove(roomRef);
          await remove(ref(db, `chats/${currentRoomId}`));
        }
      }
    }
  }

  // Reset UI
  currentRoomId = null;
  if (chatUnsubscribe) chatUnsubscribe();
  if (roomUnsubscribe) roomUnsubscribe();
  
  document.getElementById("chatMenu").classList.remove("hidden");
  document.getElementById("chatInterface").classList.add("hidden");
  showChatMenu(); // Cập nhật danh sách phòng
}

/* ===== HIỂN THỊ DANH SÁCH PHÒNG ĐÃ THAM GIA ===== */
async function showChatMenu() {
  const listDiv = document.getElementById("myRoomsList");
  if (!listDiv) return;

  // Quét tất cả các phòng xem user có trong đó không
  const snap = await get(ref(db, "rooms"));
  if (!snap.exists()) {
    listDiv.innerHTML = "";
    return;
  }

  const rooms = snap.val();
  const myUser = session.get().username;
  let html = "";
  
  for (const [id, data] of Object.entries(rooms)) {
    if (data.members && data.members[myUser]) {
      const count = Object.keys(data.members).length;
      html += `
        <div class="room-card">
          <div>
            <strong style="color: var(--neon-cyan);">${data.name}</strong>
            <div style="font-size: 0.8rem; color: #8ab;">ID: ${id} | ${count} thành viên</div>
          </div>
          <button onclick="window.joinExistingRoom('${id}', '${data.name}')">Vào</button>
        </div>
      `;
    }
  }
  
  listDiv.innerHTML = html || `<p style="color:#8ab; text-align:center;">Bạn chưa tham gia phòng nào.</p>`;
}

// Hàm toàn cục để nút "Vào" trong list có thể gọi
window.joinExistingRoom = (id, name) => {
  enterRoom(id, name, session.get());
};

/* ===== KHỞI TẠO CHUNG ===== */
window.addEventListener("DOMContentLoaded", async () => {
  bindLoginUI();

  try {
    await ensureOwner();
  } catch (e) {
    console.error("❌ ensureOwner error:", e);
  }

  const u = session.get();
  if (u) showDashboard(u);
});

/* Các hàm Login giữ nguyên như cũ */
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
      
      if (!k) { msg.className = "msg error"; msg.textContent = "Nhập private key"; return; }
      
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
}

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
