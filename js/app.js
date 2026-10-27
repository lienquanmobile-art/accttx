setInterval(()=>{if(ses&&ses.role=='guest'){const g=S.keys.find(k=>k.key==ses.key);if(!g||status(g)==2){alert('Key đã hết hạn');return logout()}const t=$('#tm');if(t)t.textContent='Thời gian Key : '+fmt((g.start+g.dur*1000-Date.now())/1000)}},1000);
function ls(s){return new Promise((r,j)=>{const x=document.createElement('script');x.src=s;x.onload=r;x.onerror=j;document.head.appendChild(x)})}
(async()=>{render();try{const v='10.12.2',b='https://www.gstatic.com/firebasejs/'+v+'/';await ls(b+'firebase-app-compat.js');await ls(b+'firebase-firestore-compat.js');
 firebase.initializeApp(CFG);dbRef=firebase.firestore().doc('app/state');
 dbRef.onSnapshot(s=>{if(!s.exists)return save();try{S=Object.assign({users:[],keys:[],lq:[],cs:[],logs:[]},JSON.parse(s.data().json))}catch(x){return}
  if(!S.users.some(u=>u.role=='owner'))S.users.unshift(OWNER);localStorage.setItem('st',JSON.stringify(S));if(!document.activeElement||document.activeElement.tagName!='INPUT')render()})}catch(x){console.warn('Firebase không tải được, dùng localStorage')}})();

