/* =====================================================================
   LB Music · Accounts (Firebase)  –  loaded LAST in index.html
   Google sign-in + email/password, and cloud sync so the account
   follows people to a new phone (Pro plan, settings, themes, favourites
   and playlists by song name, Song Lab + Studio projects).
   Song files themselves stay on each phone.
   ===================================================================== */
(()=>{
if(window.__lbAcc)return;window.__lbAcc=1;

/* ---------- your Firebase web-app config (public by design) ---------- */
const FIREBASE_CONFIG={
  apiKey:"AIzaSyDVtnVNCuo1S0dVRvtZGiVHmkb2NDzjcEU",
  authDomain:"lb-music-6f426.firebaseapp.com",
  projectId:"lb-music-6f426",
  storageBucket:"lb-music-6f426.firebasestorage.app",
  messagingSenderId:"470646274859",
  appId:"1:470646274859:web:14a53a514316f76cbd1cf1"
};
const SDK='10.12.2',CDN='https://www.gstatic.com/firebasejs/'+SDK+'/';

const ACC=window.LBACC={uid:null,email:null,name:null,ready:false,configured:!!(FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.projectId)};
let FB=null,auth=null,db=null,user=null,mode='login',msg='',working=false,pushT=null,pulling=false,loadP=null;
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return String(h)+':'+s.length};
const ERR={
 'auth/invalid-credential':'Wrong email or password.','auth/wrong-password':'Wrong email or password.','auth/user-not-found':'No account with that email. Tap “Create account”.',
 'auth/email-already-in-use':'That email already has an account. Tap “Log in” instead.','auth/weak-password':'Use a password with at least 6 characters.',
 'auth/invalid-email':'That email does not look right.','auth/missing-password':'Type your password.','auth/network-request-failed':'No internet connection. Try again online.',
 'auth/popup-closed-by-user':'Google sign-in was closed before it finished.','auth/cancelled-popup-request':'Google sign-in was cancelled.',
 'auth/unauthorized-domain':'This website is not allowed yet. In Firebase → Authentication → Settings → Authorized domains, add: '+location.hostname,
 'auth/operation-not-allowed':'This sign-in method is not turned on in Firebase (Authentication → Sign-in method).',
 'auth/too-many-requests':'Too many tries. Wait a minute and try again.','auth/user-disabled':'This account has been disabled.',
 'permission-denied':'Firebase blocked the save. Check that the Firestore rules were pasted and published.'};
const errText=e=>ERR[e&&e.code]||ERR[(e&&e.code||'').replace('firestore/','')]||('Something went wrong'+(e&&e.code?' ('+e.code+')':'')+'. Try again.');

/* ---------- load Firebase only when needed ---------- */
function loadFB(){
 if(FB)return Promise.resolve(FB);
 if(loadP)return loadP;
 loadP=(async()=>{
  const [a,au,fs]=await Promise.all([import(CDN+'firebase-app.js'),import(CDN+'firebase-auth.js'),import(CDN+'firebase-firestore.js')]);
  const app=a.initializeApp(FIREBASE_CONFIG);auth=au.getAuth(app);db=fs.getFirestore(app);FB={a,au,fs};
  au.onAuthStateChanged(auth,onUser);
  au.getRedirectResult(auth).catch(e=>{msg=errText(e);draw()});
  return FB})().catch(e=>{loadP=null;throw e});
 return loadP}

/* ---------- what gets synced ---------- */
const songKey=s=>s.name+'|'+s.size;
function resolvePending(){
 const map={};S.songs.forEach(s=>map[songKey(s)]=s.id);let ch=false;
 const pf=LS('accfav',[]),still=[];
 pf.forEach(k=>{if(map[k]){if(!S.fav.includes(map[k])){S.fav.push(map[k]);ch=true}}else still.push(k)});
 if(still.length!==pf.length){SV('accfav',still);SV('fav',S.fav)}
 S.pl.forEach(p=>{if(!p.xk||!p.xk.length)return;const rest=[];p.xk.forEach(k=>{if(map[k]){if(!p.ids.includes(map[k])){p.ids.push(map[k]);ch=true}}else rest.push(k)});if(rest.length!==p.xk.length){p.xk=rest;ch=true}});
 if(ch)SV('pl',S.pl)}
function snap(){
 resolvePending();
 const byId={};S.songs.forEach(s=>byId[s.id]=songKey(s));
 const set={...S.set};delete set.accA;delete set.accB;
 const fav=[...new Set([...S.fav.map(id=>byId[id]).filter(Boolean),...LS('accfav',[])])];
 const pl=S.pl.map(p=>({id:p.id,name:p.name,keys:[...p.ids.map(id=>byId[id]).filter(Boolean),...(p.xk||[])]}));
 const labp=LS('labp',[]).map(p=>({...p,sections:(p.sections||[]).map(s=>({...s,take:null}))}));
 return{set,fav,pl,mk:LS('mk',null),beats:LS('beats',{}),studio:LS('studio',[]),sdel:LS('studio_del',[]),labp,vauto:LS('vauto',true)}}
function mergeById(local,cloud,newer){
 const out=[...local];
 (cloud||[]).forEach(c=>{const i=out.findIndex(x=>x.id===c.id);if(i<0)out.push(c);else if(newer&&(c.upd||0)>(out[i].upd||0))out[i]=c});
 return out}
function applyCloud(d,first,localChanged){
 if(!d)return;
 const cloudWins=!first&&!localChanged,map={};S.songs.forEach(s=>map[songKey(s)]=s.id);
 if(d.set&&(first||cloudWins)){const keep={accA:S.set.accA,accB:S.set.accB},cust=Object.assign({},S.set.cust,d.set.cust||{});Object.assign(S.set,d.set,keep);S.set.cust=cust;
  if(!Array.isArray(S.set.gains)||S.set.gains.length!==10)S.set.gains=[0,0,0,0,0,0,0,0,0,0];SV('set',S.set)}
 /* favourites (matched by song file name + size) */
 const cf=d.fav||[],ids=cf.map(k=>map[k]).filter(Boolean),pend=cf.filter(k=>!map[k]);
 S.fav=cloudWins?ids:[...new Set([...S.fav,...ids])];SV('fav',S.fav);SV('accfav',cloudWins?pend:[...new Set([...LS('accfav',[]),...pend])]);
 /* playlists */
 const cpl=(d.pl||[]).map(p=>({id:p.id,name:p.name,ids:(p.keys||[]).map(k=>map[k]).filter(Boolean),xk:(p.keys||[]).filter(k=>!map[k])}));
 if(cloudWins)S.pl=cpl;else{cpl.forEach(c=>{const l=S.pl.find(x=>x.id===c.id);if(!l)S.pl.push(c);else{l.ids=[...new Set([...l.ids,...c.ids])];l.xk=[...new Set([...(l.xk||[]),...c.xk])]}})}
 SV('pl',S.pl);
 if(d.mk&&(first||cloudWins))SV('mk',d.mk);
 if(d.beats)SV('beats',Object.assign({},d.beats,LS('beats',{})));
 /* Studio projects: newest wins, deletions travel too */
 const del=[...new Set([...LS('studio_del',[]),...(d.sdel||[])])];SV('studio_del',del);
 SV('studio',mergeById(LS('studio',[]),d.studio,true).filter(p=>!del.includes(p.id)));
 /* Song Lab: never overwrite a project that already exists here */
 SV('labp',mergeById(LS('labp',[]),d.labp,false));
 if(typeof d.vauto==='boolean'&&first)SV('vauto',d.vauto);
 try{applyTheme();buildLive();refresh()}catch(e){}
 window.dispatchEvent(new Event('lb-sync'))}

/* ---------- pull / push ---------- */
const hKey=()=>'acc_h_'+(user&&user.uid);
async function pull(){
 if(!user||pulling)return;pulling=true;
 try{const {fs}=FB,uid=user.uid;
  const [u,p]=await Promise.all([fs.getDoc(fs.doc(db,'users',uid)),fs.getDoc(fs.doc(db,'pro',uid))]);
  const last=LS(hKey(),null),localChanged=last!==null&&hash(JSON.stringify(snap()))!==last,first=last===null;
  if(u.exists()){let d=null;try{d=JSON.parse(u.data().json||'null')}catch(e){}applyCloud(d,first,localChanged)}
  applyPro(p.exists()?p.data():null);
  await push(true)}
 catch(e){if(e&&e.code==='permission-denied')toast('Cloud sync is blocked. Publish the Firestore rules first.');}
 finally{pulling=false;draw()}}
function applyPro(d){
 const was=isPro(),cur=LS('pro',null);
 const valid=d&&(d.exp===0||d.exp===undefined&&d.plan||+d.exp>Date.now());
 if(valid){const exp=+d.exp||0;SV('pro',{ok:true,code:'ACCOUNT',exp,cloud:1,plan:d.plan||''});}
 else if(cur&&cur.cloud){SV('pro',null)}
 try{applyTheme();buildLive();placeAds()}catch(e){}
 if(!was&&isPro())toast('👑 Pro is active on your account');
 ACC.pro=!!valid}
async function push(force){
 if(!user||!FB)return;
 try{const body=JSON.stringify(snap()),h=hash(body);
  if(!force&&h===LS(hKey(),null))return;
  if(body.length>900000){if(!push.warned){push.warned=1;toast('Your projects are too big to sync. Delete old ones.')}return}
  const {fs}=FB;await fs.setDoc(fs.doc(db,'users',user.uid),{t:Date.now(),email:user.email||'',name:user.displayName||'',json:body});
  SV(hKey(),h);ACC.synced=Date.now()}catch(e){if(e&&e.code==='permission-denied'&&!push.denied){push.denied=1;toast('Cloud sync is blocked. Publish the Firestore rules first.')}}}
const pushSoon=()=>{clearTimeout(pushT);pushT=setTimeout(()=>push(),2500)};
ACC.sync=async()=>{if(!user)return toast('Log in first');toast('Syncing…');await pull();toast('Synced ✅')};
ACC.pushSoon=pushSoon;
setInterval(()=>{if(user&&!document.hidden)push()},20000);
document.addEventListener('visibilitychange',()=>{if(user&&document.hidden)push()});
window.addEventListener('lb-changed',pushSoon);

/* ---------- auth state ---------- */
function onUser(u){
 user=u;ACC.uid=u?u.uid:null;ACC.email=u?u.email:null;ACC.name=u?(u.displayName||(u.email||'').split('@')[0]):null;ACC.ready=true;
 SV('acc_in',!!u);btn();
 if(u){msg='';pull()}else{if(LS('pro',null)&&LS('pro',null).cloud){SV('pro',null);try{applyTheme();buildLive();placeAds()}catch(e){}}}
 draw()}
function btn(){const b=$('#accBtn');if(!b)return;b.textContent=user?((ACC.name||'?')[0]||'?').toUpperCase():'👤';b.style.background=user?'var(--ac)':'';b.style.color=user?'#04201c':'';b.style.fontWeight=user?'800':''}

/* ---------- actions ---------- */
async function run(fn){if(working)return;working=true;msg='';draw();
 try{await loadFB();await fn(FB)}catch(e){msg=(e&&e.code)?errText(e):'Could not reach Firebase. Check your internet and try again.'}
 working=false;draw()}
const google=()=>run(async({au})=>{
 const p=new au.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
 try{await au.signInWithPopup(auth,p);toast('Welcome 👋')}
 catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'){await au.signInWithRedirect(auth,p)}else throw e}});
const emailGo=()=>{const em=$('#acE').value.trim(),pw=$('#acP').value,nm=($('#acN')||{}).value||'';
 if(!em||!pw){msg='Type your email and password.';return draw()}
 run(async({au})=>{if(mode==='signup'){const c=await au.createUserWithEmailAndPassword(auth,em,pw);if(nm.trim())await au.updateProfile(c.user,{displayName:nm.trim()});ACC.name=nm.trim()||ACC.name;toast('Account created 🎉')}
  else{await au.signInWithEmailAndPassword(auth,em,pw);toast('Welcome back 👋')}})};
const reset=()=>{const em=$('#acE').value.trim();if(!em){msg='Type your email first, then tap “Forgot password”.';return draw()}
 run(async({au})=>{await au.sendPasswordResetEmail(auth,em);msg='✅ We sent a reset link to '+em+'. Check your inbox (and spam).'})};
const logout=async()=>{try{await push()}catch(e){}try{await FB.au.signOut(auth)}catch(e){}
 ['fav','pl'].forEach(()=>0);toast('Logged out')};
const wipe=()=>{if(!user||!confirm('Delete your saved cloud data? Your phone keeps everything. Your Pro plan stays.'))return;
 run(async({fs})=>{await fs.deleteDoc(fs.doc(db,'users',user.uid));SV(hKey(),null);toast('Cloud data deleted')})};

/* ---------- page ---------- */
document.body.insertAdjacentHTML('beforeend','<section id="account" class="page"><div class="top"><button class="ic" onclick="back()">‹</button><h3>My account</h3><span></span></div><div id="accBody"></div></section>');
const top=document.querySelector('#music .top .r');
if(top&&ACC.configured)top.insertAdjacentHTML('afterbegin','<button class="ic" id="accBtn" onclick="show(\'account\')" title="Account">👤</button>');
function proLine(){const p=LS('pro',null);if(!isPro())return'Free plan';if(p&&p.exp)return'Pro until '+new Date(p.exp).toLocaleDateString();return'Pro · lifetime'}
function draw(){const b=$('#accBody');if(!b)return;
 if(!ACC.configured){b.innerHTML='<div class="empty">Accounts are not set up yet.</div>';return}
 const m=msg?`<div class="set" style="border-left:4px solid var(--ac)"><span style="font-size:13px;line-height:1.5">${E(msg)}</span></div>`:'';
 if(user){
  b.innerHTML=`<div class="set" style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:var(--ac);color:#04201c;font-size:28px;font-weight:800;display:grid;place-items:center;margin:4px auto 10px">${E((ACC.name||'?')[0]||'?').toUpperCase()}</div><b style="font-size:17px">${E(ACC.name||'')}</b><div class="mut">${E(user.email||'')}</div><div style="margin-top:8px"><span class="tag">${E(proLine())}</span></div></div>${m}
  <div class="set"><b>Your account ID</b><div class="mut">Send this when you pay for Pro, so we switch it on for your account. It then works on any phone you log in on.</div>
   <p style="font-family:monospace;font-size:13px;word-break:break-all;margin:10px 0">${E(user.uid)}</p><button class="pill" id="acCopy">📋 Copy ID</button>${isPro()?'':'<button class="pill pr" onclick="show(\'pro\')">👑 Go Pro</button>'}</div>
  <div class="set"><b>Cloud sync</b><div class="mut">Saved to your account: Pro plan, settings, themes, equalizer presets, favourites and playlists (by song name), Song Lab and Studio projects. Song files stay on each phone.${ACC.synced?'<br>Last saved: '+new Date(ACC.synced).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</div><button class="pill" id="acSync">🔄 Sync now</button></div>
  <div class="set"><button class="pill" id="acOut">Log out</button><button class="pill dng" id="acDel">Delete my cloud data</button></div>`;
  $('#acCopy').onclick=()=>{try{navigator.clipboard.writeText(user.uid);toast('ID copied')}catch(e){toast('Press and hold the ID to copy it')}};
  $('#acSync').onclick=ACC.sync;$('#acOut').onclick=logout;$('#acDel').onclick=wipe;return}
 const su=mode==='signup';
 b.innerHTML=`<div class="set" style="text-align:center"><div style="font-size:40px">🎧</div><b style="font-size:18px">${su?'Create your free account':'Log in to LB Music'}</b><div class="mut" style="margin-top:6px">Your Pro plan, themes and music-making projects follow you to any phone.</div></div>${m}
  <div class="set"><button class="pill" id="acG" style="width:100%;padding:14px;font-size:15px;font-weight:700" ${working?'disabled':''}>🔐 Continue with Google</button>
  <div class="mut" style="text-align:center;margin:12px 0">or use your email</div>
  ${su?'<input id="acN" placeholder="Your name" autocomplete="name">':''}<input id="acE" type="email" placeholder="Email" autocomplete="email" inputmode="email"><input id="acP" type="password" placeholder="Password (6+ characters)" autocomplete="${su?'new-password':'current-password'}">
  <button class="pill pr" id="acGo" style="width:100%;padding:14px;margin-top:10px" ${working?'disabled':''}>${working?'Please wait…':su?'Create account':'Log in'}</button>
  <div style="display:flex;justify-content:space-between;margin-top:12px"><button class="mut" id="acSw" style="text-decoration:underline">${su?'I already have an account':'Create a new account'}</button>${su?'':'<button class="mut" id="acRs" style="text-decoration:underline">Forgot password?</button>'}</div></div>`;
 $('#acG').onclick=google;$('#acGo').onclick=emailGo;$('#acSw').onclick=()=>{mode=su?'login':'signup';msg='';draw()};const rs=$('#acRs');if(rs)rs.onclick=reset}
R.account=()=>{draw();if(ACC.configured&&!FB&&!loadP)loadFB().catch(()=>{msg='Could not reach Firebase. Check your internet.';draw()})};

/* ---------- Settings box ---------- */
if(ACC.configured){const _rs=renderSettings;
 renderSettings=function(){_rs();const b=$('#setBody');if(!b)return;const x=document.createElement('div');x.className='set';
  x.innerHTML=`<b>👤 My account</b><div class="mut">${user?'Signed in as <b>'+E(user.email||ACC.name)+'</b>':'Log in so your Pro plan and projects follow you to any phone.'}</div>`;
  const y=document.createElement('button');y.className='pill pr';y.textContent=user?'Open account':'Log in / Sign up';y.onclick=()=>show('account');x.append(y);b.insertBefore(x,b.firstChild)};
 R.settings=renderSettings}

/* ---------- start: reconnect quietly if they were signed in, invite once if not ---------- */
if(ACC.configured){
 if(LS('acc_in',false))setTimeout(()=>loadFB().catch(()=>{}),1500);
 if(!LS('acc_ask',0)){let n=0;const t=setInterval(()=>{if(++n>40||LS('acc_in',false)){clearInterval(t);return}
  const intro=$('#intro'),splash=$('#splash');if((intro&&intro.classList.contains('on'))||splash)return;clearInterval(t);
  if(user||LS('acc_ask',0))return;SV('acc_ask',1);
  sheet('Create a free account',[{ic:'🔐',t:'Sign up / Log in',fn:()=>show('account')},{ic:'⏳',t:'Maybe later',fn:()=>{}}],Object.assign(document.createElement('p'),{className:'mut',style:'text-align:center;margin:0 0 10px;line-height:1.5',textContent:'Keep your Pro plan, themes and music projects on any phone — even a new one.'}))},3000)}}
btn();
ACC._t={snap,applyCloud,hash,mergeById,resolvePending};
})();
