function listAcc(c){return `<h3>Danh sách tài khoản đã thêm (${S[c].length})</h3>`+S[c].map((a,i)=>`<div class="item s1"><div class="row"><span>Tên: ${e(a.u)}\nMật khẩu: ${e(a.p)}${c=='lq'?`\nSố tướng: ${e(a.t)} | Số skin: ${e(a.s)}\nTrạng thái: ${a.open?'Mở':'Khóa'}`:''}</span><button onclick="del('${c}',${i})">Xóa</button></div></div>`).join('')}
function lqTab(c){const L=c=='lq';return `<div class="card"><h3>Thêm tài khoản ${L?'Liên Quân':'Chung sức'}</h3>
<input id="a" placeholder="Tên tài khoản"><input id="b" placeholder="Mật khẩu">
${L?`<input id="c" type="number" placeholder="Số tướng"><input id="d" type="number" placeholder="Số skin"><select id="e"><option value="1">Trạng thái: Mở</option><option value="0">Trạng thái: Khóa</option></select>`:''}
<button class="full" onclick="addAcc('${c}')">Thêm</button></div><div class="card">${listAcc(c)}</div>`}
function tabs(list){return `<div class="tabs">${list.map(([k,l])=>`<button class="${tab==k?'on':''}" onclick="tab='${k}';out='';render()">${l}</button>`).join('')}</div>`}
function render(){const A=$('#app');
 if(!ses){A.innerHTML=`<h1>BLACK</h1><div class="card"><label>Tên đăng nhập</label><input id="u"><label>Mật khẩu</label><input id="p" type="password"><button class="full" onclick="login()">Đăng nhập</button><div class="or">or</div><input id="k" placeholder="Private key"><button class="full" onclick="keyLogin()">Đăng nhập bằng Key</button><div class="err">${e(msg)}</div></div>`;return}
 const r=ses.role;let h=`<div class="row"><h2 style="margin:0">${e(ses.name)} • ${r.toUpperCase()}</h2><button onclick="logout()">Đăng xuất</button></div>`;
 if(r=='user'||r=='guest'){const g=r=='guest'&&S.keys.find(k=>k.key==ses.key);
  if(g)h+=`<div class="timer" id="tm">Thời gian Key : ${fmt((g.start+g.dur*1000-Date.now())/1000)}</div>`;
  h+=`<div class="card"><button class="full big" onclick="claim()">Nhận acc cộng đồng</button>${out?`<div class="res">${e(out)}</div><button onclick="copy(out)" style="margin-top:8px">Sao chép</button>`:''}</div>`}
 else{const T=[['acc','Tạo tài khoản'],['key','Key'],['lq','Thêm tài khoản Liên Quân'],['cs','Thêm tài khoản Chung sức']];if(r=='owner')T.push(['log','Log']);if(!tab)tab='acc';h+=tabs(T);
  if(tab=='acc')h+=`<div class="card"><label>Loại tài khoản</label>${r=='owner'?'<select id="r"><option value="admin">Admin</option><option value="user">User</option></select>':'<input value="User" disabled>'}<label>Tên đăng nhập</label><input id="nu"><label>Mật khẩu</label><input id="np"><button class="full" onclick="mkAcc()">Tạo</button>${out?`<div class="res">${e(out)}</div><button onclick="copy(out)" style="margin-top:8px">Sao chép</button>`:''}</div>`;
  if(tab=='key'){h+=`<div class="tabs"><button class="${sub=='new'?'on':''}" onclick="sub='new';out='';render()">Tạo Key</button><button class="${sub=='list'?'on':''}" onclick="sub='list';render()">Danh sách key đã tạo</button></div>`;
   if(sub=='new')h+=`<div class="card"><label>Tên Key</label><input id="kn"><label>Thời gian</label><select id="kd">${Object.keys(DUR).map(d=>`<option>${d}</option>`).join('')}</select><button class="full" onclick="mkKey()">Tạo</button>${out?`<div class="res">${e(out)}</div><button onclick="copy(out.split('Private key : ')[1])" style="margin-top:8px">Sao chép</button>`:''}</div>`;
   else h+=S.keys.map(k=>{const s=status(k);return `<div class="item s${s}">Tên Key : ${e(k.name)}\nThời gian : ${fmt(k.dur)} (${k.label})\nPrivate key : ${k.key}\nSố acc đã lấy : ${k.claimed}/${k.max==null?'∞':k.max}\nTrạng Thái : ${ST[s]}</div>`}).join('')||'<div class="or">Chưa có key</div>'}
  if(tab=='lq')h+=lqTab('lq');if(tab=='cs')h+=lqTab('cs');
  if(tab=='log')h+=`<div class="card">${S.logs.map(l=>`<div class="item s0">${e(l.t)} — ${e(l.a)}: ${e(l.x)}</div>`).join('')||'Trống'}</div>`}
 A.innerHTML=h}
