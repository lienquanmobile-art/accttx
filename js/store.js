const $=s=>document.querySelector(s),e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let S,ses,tab,sub='new',msg='',out='',dbRef=null,lq='';
try{S=JSON.parse(localStorage.getItem('st'))}catch(x){}
S=Object.assign({users:[],keys:[],lq:[],cs:[],logs:[]},S||{});
if(!S.users.some(u=>u.role=='owner'))S.users.unshift(OWNER);
try{ses=JSON.parse(localStorage.getItem('ses'))}catch(x){}
function save(){try{localStorage.setItem('st',JSON.stringify(S))}catch(x){}if(dbRef)dbRef.set(JSON.stringify(S)).catch(()=>{})}
function log(t){S.logs.unshift({t:new Date().toLocaleString('vi-VN'),a:ses?ses.name+' ('+ses.role+')':'-',x:t})}
const rnd=()=>{const c='abcdefghijklmnopqrstuvwxyz0123456789';return Array.from({length:8},()=>c[Math.random()*36|0]).join('')};
const allKeys=()=>[...S.users.map(u=>u.key),...S.keys.map(k=>k.key)];
function uniq(pre){let k;do k=pre+rnd();while(allKeys().includes(k));return k}
const fmt=s=>{s=Math.max(0,Math.floor(s));return[s/3600|0,s/60%60|0,s%60].map(n=>String(n).padStart(2,'0')).join(':')};
function status(k){if(!k.start)return 0;return Date.now()>k.start+k.dur*1000?2:1}
const ST=['Chưa kích hoạt','Đã kích hoạt','Hết hạn'];
function copy(t){navigator.clipboard.writeText(t).then(()=>alert('Đã sao chép'))}
