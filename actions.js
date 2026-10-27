function login(){const u=$('#u').value.trim(),p=$('#p').value;const f=S.users.find(x=>x.u==u&&x.p==p);
 if(!f)return msg='Sai tên đăng nhập hoặc mật khẩu',render();start({role:f.role,name:f.u})}
function keyLogin(){const k=($('#k').value||prompt('Nhập private key:')||'').trim();if(!k)return;
 const f=S.users.find(x=>x.key==k);if(f)return start({role:f.role,name:f.u});
 const g=S.keys.find(x=>x.key==k);if(!g||status(g)==2)return msg='Key không tồn tại hoặc đã hết hạn',render();
 if(!g.start){g.start=Date.now();ses={role:'guest',name:g.name};log('Kích hoạt key '+g.key);save()}
 start({role:'guest',name:g.name,key:k})}
function start(s){ses=s;localStorage.setItem('ses',JSON.stringify(s));msg='';tab=s.role=='user'||s.role=='guest'?'':'acc';log('Đăng nhập');save();render()}
function logout(){ses=null;localStorage.removeItem('ses');out='';render()}
function mkAcc(){const r=ses.role=='admin'?'user':$('#r').value,u=$('#nu').value.trim(),p=$('#np').value;
 if(!u||!p)return alert('Nhập đủ thông tin');if(S.users.some(x=>x.u==u))return alert('Tên đăng nhập đã tồn tại');
 const key=uniq('BLACK'+r.toUpperCase()+'_');S.users.push({role:r,u,p,key});log('Tạo tài khoản '+r+': '+u);save();
 out=`Loại tài khoản : ${r}\nTên đăng nhập : ${u}\nMật khẩu : ${p}\nPrivate key : ${key}`;render()}
function mkKey(){const n=$('#kn').value.trim(),d=$('#kd').value;if(!n)return alert('Nhập tên key');const [s,m]=DUR[d],key=uniq('BLACK_');
 S.keys.unshift({name:n,key,dur:s,max:m,claimed:0,start:null,label:d});log('Tạo key '+key+' ('+d+') cho '+n);save();
 out=`Tên Key : ${n}\nThời gian : ${fmt(s)}\nPrivate key : ${key}`;render()}
function addAcc(c){const f=x=>$('#'+x).value.trim();
 if(c=='lq'){if(!f('a')||!f('b'))return alert('Nhập tên và mật khẩu');S.lq.push({u:f('a'),p:f('b'),t:f('c'),s:f('d'),open:$('#e').value=='1'})}
 else{if(!f('a')||!f('b'))return alert('Nhập tên và mật khẩu');S.cs.push({u:f('a'),p:f('b')})}
 log('Thêm tài khoản '+(c=='lq'?'Liên Quân':'Chung sức')+': '+f('a'));save();render()}
function del(c,i){log('Xóa tài khoản '+S[c][i].u);S[c].splice(i,1);save();render()}
function claim(){const g=ses.role=='guest'?S.keys.find(k=>k.key==ses.key):null;
 if(g&&g.max!=null&&g.claimed>=g.max){out='';return alert('Key đã hết lượt lấy acc ('+g.claimed+'/'+g.max+')')}
 const o=S.lq.map((a,i)=>[a,i]).filter(x=>x[0].open);if(!o.length)return alert('Hiện hết acc, vui lòng quay lại sau');
 const [a,i]=o[Math.random()*o.length|0];S.lq.splice(i,1);if(g)g.claimed++;log('Nhận acc '+a.u);save();
 out=`Tên đăng nhập : ${a.u}\nMật Khẩu : ${a.p}\nSố tướng : ${a.t}\nSố skin : ${a.s}\nTrạng thái : Mở\nLưu ý : Nếu acc bị khóa LH 0942.836.367`;render()}
