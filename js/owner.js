/* ===== TAB 4: CHUNG SỨC (Đã cập nhật trạng thái) ===== */
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
        <thead>
          <tr>
            <th>Tên TK</th>
            <th>Mật khẩu</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
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
    // Mặc định tạo mới sẽ là "Chưa hoàn thành" (false)
    await set(ref(db, `chungsuc/${id}`), { 
      username, 
      password, 
      isCompleted: false,
      createdAt: new Date().toISOString() 
    });
    
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
      body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#8ab">Chưa có acc</td></tr>`;
      return;
    }
    
    body.innerHTML = list.map(([id, a]) => {
      // Nếu isCompleted = true thì Hoàn Thành (Xanh), ngược lại Chưa (Đỏ)
      const isDone = a.isCompleted === true;
      const statusClass = isDone ? "status open" : "status locked"; // Tái sử dụng class màu xanh/đỏ có sẵn
      const statusText = isDone ? "Hoàn Thành" : "Chưa Hoàn Thành";
      
      return `
      <tr>
        <td>${a.username}</td>
        <td>${a.password}</td>
        <td>
          <span class="${statusClass}" style="cursor: pointer; user-select: none;" data-toggle-status="${id}" data-current="${isDone}">
            ${statusText}
          </span>
        </td>
        <td>
          <button class="copy-btn" style="border-color:var(--red); color:var(--red);" data-del="${id}">Xóa</button>
        </td>
      </tr>
    `}).join("");

    // Sự kiện click vào chữ để chuyển đổi Hoàn Thành / Chưa
    body.querySelectorAll("[data-toggle-status]").forEach(el => {
      el.onclick = async () => {
        const id = el.dataset.toggleStatus;
        const current = el.dataset.current === "true";
        await update(ref(db, `chungsuc/${id}`), { isCompleted: !current });
        toast(`Đã chuyển sang ${!current ? "Hoàn Thành" : "Chưa Hoàn Thành"}`, "ok");
      };
    });

    // Sự kiện xóa
    body.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Bạn có chắc chắn muốn xóa acc này?")) return;
        await remove(ref(db, `chungsuc/${b.dataset.del}`));
        toast("Đã xóa", "ok");
      };
    });
  });
}
