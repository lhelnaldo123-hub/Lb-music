/* LB Music extras – loaded AFTER the main script */
(()=>{
/* ====== EDIT THESE ====== */
const X={
 SECRET:'lbm-7Kq29xZp-Gh44-2026',   // must match admin.html
 MOMO_NUMBER:'0599428017', MOMO_NAME:'LB Music', NETWORK:'Mobile Money',
 PLANS:[
  {id:'LB30',n:'1 month',p:'GH₵ 15',days:30},
  {id:'LB365',n:'1 year',p:'GH₵ 150',days:365},
  {id:'LBLIFE',n:'Lifetime',p:'GH₵ 300',days:0}],
 YT_KEY:'',        // free YouTube Data API key (console.cloud.google.com) for the Videos tab
 JAMENDO_ID:'',    // optional free key from devportal.jamendo.com
 AD_EVERY:3,       // sound ad after every N songs (free users, online only)
 AD_TEXT:'LB Music is free thanks to our sponsors. Go Pro to remove ads.',
 AUDIO_ADS:[],     // optional: links to your own short mp3 ads
 FREE_SAVES:5      // free users can save this many online songs
};
/* ======================== */
const online=()=>navigator.onLine;
const h53=s=>{let a=0xdeadbeef,b=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);return 4294967296*(2097151&b)+(a>>>0)};
const sig=(tid,pid)=>h53(tid+'|'+pid+'|'+X.SECRET).toString(36).toUpperCase().padStart(10,'0').slice(0,10);
const codeFor=(tid,pid)=>{const s=sig(tid,pid);return pid+'-'+s.slice(0,5)+'-'+s.slice(5)};
const PL=id=>X.PLANS.find(p=>p.id===id)||X.PLANS[0];
const wa=t=>`https://wa.me/${CFG.OWNER_WHATSAPP}?text=${encodeURIComponent(t)}`;
const mkbtn=(x,t,fn,c)=>{const y=document.createElement('button');y.className='pill '+(c||'');y.textContent=t;y.onclick=fn;x.append(y);return y};

/* ---------- speed + look (CSS) ---------- */
const SH='url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z\'/%3E%3C/svg%3E")';
const RP='url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z\'/%3E%3C/svg%3E")';
const st=document.createElement('style');st.textContent=`
body{background-attachment:scroll!important}
.row,.big{content-visibility:auto;contain-intrinsic-size:auto 66px}
.ctl .ib#bShuf,.ctl .ib#bRep{font-size:0;width:50px;height:50px;border-radius:16px;background:rgba(255,255,255,.09);position:relative;transition:.2s}
#bShuf::before,#bRep::before{content:"";position:absolute;inset:13px;background:#fff;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}
#bShuf::before{-webkit-mask-image:${SH};mask-image:${SH}}
#bRep::before{-webkit-mask-image:${RP};mask-image:${RP}}
#bShuf.on-ac,#bRep.on-ac{background:var(--ac)!important;box-shadow:0 4px 16px rgba(0,0,0,.4)}
#bShuf.on-ac::before,#bRep.on-ac::before{background:#04201c}
#bRep[data-m="2"]::after{content:"1";position:absolute;right:9px;top:7px;font-size:11px;font-weight:900;color:#04201c}
body[data-ic=square] .ic,body[data-ic=square] .ib,body[data-ic=square] .play,body[data-ic=square] .chip{border-radius:12px}
body[data-ic=glass] .ic,body[data-ic=glass] #bShuf,body[data-ic=glass] #bRep{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(8px)}
body[data-ic=glow] .ic.ac,body[data-ic=glow] .play{box-shadow:0 0 22px var(--ac)}
body[data-ic=glow] #nav button.on span{text-shadow:0 0 12px var(--ac)}
.mkr{margin:8px 0}.mkl{font-size:12px;color:var(--mut);margin-bottom:3px}
.mkc{display:grid;grid-template-columns:repeat(16,1fr);gap:3px}
.stp{height:30px;border-radius:6px;background:rgba(255,255,255,.08);font-size:10px;font-weight:800;color:#04201c;padding:0}
.stp.q{background:rgba(255,255,255,.17)}.stp.on{background:var(--ac)}.stp.hl{outline:2px solid #fff}
#vid{position:fixed;inset:0;z-index:70;background:#000;display:none;flex-direction:column}#vid.on{display:flex}
#vBox{aspect-ratio:16/9;width:100%;max-width:760px;margin:0 auto}#vBox iframe{width:100%;height:100%}
#vL{flex:1;overflow:auto;text-align:center;padding:30px 12px;font-size:20px;font-weight:700;line-height:1.5;background:linear-gradient(#000,var(--bg))}
#vL p{color:#ffffff66;transition:.2s;padding:4px 0}#vL p.cu{color:#fff;font-size:23px}
`;document.head.append(st);

/* faster, smoother audio on weak phones */
const AC0=window.AudioContext||window.webkitAudioContext;
if(AC0)window.AudioContext=class extends AC0{constructor(o){super({latencyHint:'playback',...(o||{})})}};
let convOn=true;
const _fx=applyFx;
applyFx=function(){_fx();if(!ctx||!conv)return;const need=S.set.rev>0;if(need!==convOn){try{need?bsh.connect(conv):bsh.disconnect(conv)}catch(e){}convOn=need}};
const _fill=fill;fill=(box,list,lim=60)=>_fill(box,list,lim);
const _ui=ui;
ui=function(){_ui();const b=$('#bRep');if(b)b.dataset.m=S.set.rep;try{if(navigator.mediaSession)navigator.mediaSession.playbackState=au.paused?'paused':'playing'}catch(e){}};

/* ---------- ads: only when online ---------- */
const _sa=showAd;showAd=function(k){if(!online())return;_sa(k)};
const _pa=placeAds;placeAds=function(){if(!online()){document.querySelectorAll('.adslot').forEach(e=>e.innerHTML='');return}_pa()};
addEventListener('offline',()=>placeAds());
let adBusy=false,adC=0;
function playAd(done){if(adBusy)return done();adBusy=true;let fin=false,a;
 const end=()=>{if(fin)return;fin=true;adBusy=false;try{a&&a.pause()}catch(e){}try{speechSynthesis.cancel()}catch(e){}done()};
 setTimeout(end,9000);toast('📢 Sponsor message');
 if(X.AUDIO_ADS.length){a=new Audio(X.AUDIO_ADS[Math.floor(Math.random()*X.AUDIO_ADS.length)]);a.onended=end;a.onerror=end;a.play().catch(end)}
 else if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance(X.AD_TEXT);u.onend=end;u.onerror=end;speechSynthesis.speak(u)}else end()}
const _pn=pickNext;
pickNext=function(dir){if(dir>0&&online()&&!adfree()&&++adC%X.AD_EVERY===0){try{au.pause()}catch(e){}return playAd(()=>_pn(dir))}_pn(dir)};

/* ---------- themes ---------- */
Object.assign(TH,{
 midnight:{n:'Midnight',a:'#6ea8ff',b:'#b28dff',bg:'#070b1f',g:'#16255e'},
 wine:{n:'Wine',a:'#ff6b8b',b:'#ffb86b',bg:'#1a0710',g:'#561230'},
 emerald:{n:'Emerald',a:'#34e89e',b:'#0fd8e8',bg:'#04140f',g:'#0b4a36'},
 cocoa:{n:'Cocoa',a:'#ffb067',b:'#ff7a59',bg:'#16100b',g:'#4a2a14'},
 grape:{n:'Grape',a:'#d58bff',b:'#7c6bff',bg:'#12081c',g:'#44176e'},
 steel:{n:'Steel',a:'#9fd3ff',b:'#7de3c7',bg:'#10151b',g:'#26384a'},
 candy:{n:'Candy',a:'#ff7ad1',b:'#7af0ff',bg:'#1b0b1a',g:'#5e1d57',pro:1},
 gold:{n:'Gold',a:'#ffd86b',b:'#ff9a3d',bg:'#14110a',g:'#4f3a0b',pro:1},
 ice:{n:'Ice',a:'#8be9ff',b:'#a8b5ff',bg:'#07131c',g:'#12476a',pro:1},
 lava:{n:'Lava',a:'#ff5a3d',b:'#ffb13d',bg:'#150706',g:'#5e1408',pro:1},
 mint:{n:'Mint',a:'#7dffd0',b:'#ffe27d',bg:'#06140f',g:'#14574a',pro:1},
 orchid:{n:'Orchid',a:'#ff9be8',b:'#9b8bff',bg:'#160a1c',g:'#592069',pro:1}
});
const _at=applyTheme;
applyTheme=function(){_at();if(isPro()&&S.set.bgc){const r=document.documentElement.style;r.setProperty('--bg',S.set.bgc);r.setProperty('--bgg',`radial-gradient(circle at 15% -5%,${S.set.bgc2||S.set.bgc},${S.set.bgc} 60%)`);$('#tc').content=S.set.bgc}};
const _rs=renderSettings;
renderSettings=function(){_rs();const b=$('#setBody');
 const box=(t,d)=>{const x=document.createElement('div');x.className='set';x.innerHTML=`<b>${t}</b><div class="mut">${d||''}</div>`;b.append(x);return x};
 let x=box('🎛️ Icon style','Changes how buttons look. 👑 = Pro');
 [['round','Round'],['square','Square'],['glass','Glass 👑'],['glow','Glow 👑']].forEach(([k,n])=>mkbtn(x,n+((S.set.ic||'round')===k?' ✓':''),()=>{if((k==='glass'||k==='glow')&&!isPro())return proGate(n+' icons');S.set.ic=k;SV('set',S.set);document.body.dataset.ic=k;renderSettings()}));
 x=box('🖌️ Background colour 👑','Pick your own colours. Works on top of any theme.');
 x.insertAdjacentHTML('beforeend',`<div style="display:flex;gap:10px;margin-top:8px;align-items:center"><input type="color" id="bgc" value="${S.set.bgc||'#0d0f12'}" style="width:70px;height:44px;padding:2px"><input type="color" id="bgc2" value="${S.set.bgc2||'#123a44'}" style="width:70px;height:44px;padding:2px"><span class="mut">base · glow</span></div>`);
 const sv=()=>{if(!isPro())return proGate('Custom background');S.set.bgc=$('#bgc').value;S.set.bgc2=$('#bgc2').value;SV('set',S.set);applyTheme()};
 $('#bgc').onchange=sv;$('#bgc2').onchange=sv;
 mkbtn(x,'Reset',()=>{delete S.set.bgc;delete S.set.bgc2;SV('set',S.set);applyTheme();renderSettings()},'dng')};
R.settings=renderSettings;

/* ---------- new pages ---------- */
document.body.insertAdjacentHTML('beforeend',`
<section id="pay" class="page"><div class="top"><button class="ic" onclick="back()">‹</button><h3>Upgrade to Pro</h3><span></span></div><div id="payBody"></div></section>
<section id="maker" class="page"><div class="top"><button class="ic" onclick="back()">‹</button><h3>🎹 Make a song</h3><span></span></div><div id="mkBody"></div></section>
<div id="vid"><div class="top" style="padding:12px 14px;margin:0"><button class="ic" id="vX">‹</button><b id="vT" style="flex:1;font-size:14px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"></b></div><div id="vBox"><div id="ytp"></div></div><div id="vL"></div></div>`);
$('.action').insertAdjacentHTML('beforeend','<button onclick="show(\'maker\')">🎹<br>Make a song</button>');
$('#smB').insertAdjacentHTML('afterend','<button class="chip" id="smC" onclick="setSM(2)">🎬 Videos</button>');
const _sh=show;show=function(id,nh){if(PAGE==='maker'&&id!=='maker')mStop();return _sh(id,nh)};

/* ---------- PRO + MoMo payment ---------- */
function grant(c,days){SV('pro',{ok:true,code:c,exp:days?Date.now()+days*864e5:0});SV('pend',null);applyTheme();buildLive();placeAds();toast('👑 Pro activated! Enjoy');show('pro',true)}
function activate(raw){const c=(raw||'').trim().toUpperCase().replace(/\s/g,'');if(!c)return;
 if(CFG.PRO_CODES.map(x=>x.toUpperCase()).includes(c))return grant(c,0);
 const pend=LS('pend',null),m=c.match(/^(LB[A-Z0-9]+)-/),pl=m&&X.PLANS.find(p=>p.id===m[1]);
 if(!pend)return toast('Start a payment first, then enter the code');
 if(!pl||codeFor(pend.tid,pl.id)!==c)return toast('That code does not match your payment');
 grant(c,pl.days)}
function chk(){const p=LS('pro',null);if(p&&p.exp&&Date.now()>p.exp){SV('pro',null);applyTheme();toast('Your Pro plan has ended')}}
function renderProX(){const b=$('#proBody'),ok=isPro(),p=LS('pro',null),pend=LS('pend',null),rw=LS('rew',0)>Date.now();
 b.innerHTML=`<div class="pro-h"><div style="font-size:46px">👑</div><h2>LB Music Pro</h2><p>${ok?'You are Pro — thank you! 💛'+(p&&p.exp?'<br>Active until '+new Date(p.exp).toLocaleDateString():''):'From '+esc(X.PLANS[0].p)+' / '+esc(X.PLANS[0].n)}</p></div>
 <ul class="ft"><li>🚫 No ads, no sponsor sounds</li><li>🔊 Volume booster up to 400%</li><li>🎹 Song maker: 8 tracks, 4 kits, 4 scales</li><li>⬇️ Unlimited online saves with cover art and lyrics</li><li>📝 Export lyrics</li><li>🎨 Premium themes, custom background colour, icon styles</li><li>💾 Your own equalizer presets</li></ul>`;
 if(ok)return;
 if(pend){const c=document.createElement('div');c.className='set';c.innerHTML=`<b>⏳ Unfinished payment</b><div class="mut">Transaction ${esc(pend.tid)} is waiting for confirmation.</div>`;mkbtn(c,'Continue',()=>show('pay'),'pr');b.append(c)}
 X.PLANS.forEach(pl=>{const d=document.createElement('button');d.className='pill pr';d.style.cssText='display:block;width:100%;margin:8px 0;text-align:left;padding:14px';d.innerHTML=`<b>${esc(pl.n)}</b> · ${esc(pl.p)}`;d.onclick=()=>{SV('plan',pl.id);show('pay')};b.append(d)});
 const s=document.createElement('div');s.className='set';s.innerHTML='<b>Have a code?</b><input id="pcode" placeholder="LB30-XXXXX-XXXXX" autocapitalize="characters">';mkbtn(s,'🔓 Activate',()=>activate($('#pcode').value),'pr');b.append(s);
 const r=document.createElement('div');r.className='set';r.innerHTML=`<b>Or stay free</b><div class="mut">${rw?'Ad-free until '+new Date(LS('rew',0)).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Watch one short ad for '+CFG.REWARD_MINUTES+' minutes without ads.'}</div>`;mkbtn(r,'🎁 Watch ad → '+CFG.REWARD_MINUTES+' min ad-free',()=>showAd('reward'));b.append(r)}
renderPro=renderProX;R.pro=renderProX;
function renderPay(){const b=$('#payBody');
 if(isPro()){b.innerHTML='<div class="empty">👑 You are already Pro. Thank you!</div>';return}
 const pend=LS('pend',null),pl=PL(pend?pend.plan:LS('plan',X.PLANS[0].id));
 if(!pend){
  b.innerHTML=`<div class="pro-h"><h2>${esc(pl.n)}</h2><p style="font-size:22px;font-weight:800">${esc(pl.p)}</p></div>
  <div class="set"><b>Step 1 · Pay with Mobile Money</b><div class="mut">Send exactly <b style="color:#fff">${esc(pl.p)}</b> to:</div><p style="font-size:24px;font-weight:800;margin:8px 0">${esc(X.MOMO_NUMBER)}</p><div class="mut">${esc(X.MOMO_NAME)} · ${esc(X.NETWORK)}</div><div id="pyB1"></div></div>
  <div class="set"><b>Step 2 · Paste your Transaction ID</b><div class="mut">It is in the MoMo confirmation SMS (or the Paystack reference).</div><input id="pyName" placeholder="Your name"><input id="pyTid" placeholder="Transaction ID" autocapitalize="characters"><div id="pyB2"></div></div>
  <div class="set"><b>Other plans</b><div id="pyPl"></div></div>`;
  mkbtn($('#pyB1'),'📋 Copy number',()=>{navigator.clipboard?.writeText(X.MOMO_NUMBER);toast('Number copied')});
  if(CFG.PAY_LINK)mkbtn($('#pyB1'),'💳 Pay with Paystack',()=>window.open(CFG.PAY_LINK,'_blank'),'pr');
  mkbtn($('#pyB2'),'✅ I have paid',()=>{const tid=$('#pyTid').value.toUpperCase().replace(/\s/g,''),name=$('#pyName').value.trim();
   if(tid.length<6)return toast('Paste the full Transaction ID');
   SV('pend',{tid,name,plan:pl.id,time:Date.now()});
   window.open(wa(`Hello, I paid for LB Music Pro (${pl.n}, ${pl.p}). Name: ${name}. Account ID: ${(window.LBACC&&LBACC.uid)||"none"}. Transaction ID: ${tid}`),'_blank');renderPay()},'pr');
  X.PLANS.forEach(p=>mkbtn($('#pyPl'),p.n+' · '+p.p,()=>{SV('plan',p.id);renderPay()},p.id===pl.id?'pr':''));
 }else{
  b.innerHTML=`<div class="pro-h"><div style="font-size:40px">⏳</div><h2>Waiting for confirmation</h2><p>${esc(pl.n)} · ${esc(pl.p)}</p></div>
  <div class="set"><b>Your payment</b><div class="mut">Transaction ID: <b style="color:#fff">${esc(pend.tid)}</b><br>Sent ${new Date(pend.time).toLocaleString()}</div><div id="pyW"></div></div>
  <div class="set"><b>Enter your Pro code</b><div class="mut">We send it after we confirm your payment. You can close the app and come back — this page keeps waiting.</div><input id="pyCode" placeholder="LB30-XXXXX-XXXXX" autocapitalize="characters"><div id="pyA"></div></div>
  <div class="set"><div id="pyC"></div></div>`;
  mkbtn($('#pyW'),'💬 Send ID on WhatsApp',()=>window.open(wa(`Hello, I paid for LB Music Pro (${pl.n}, ${pl.p}). Name: ${pend.name}. Account ID: ${(window.LBACC&&LBACC.uid)||"none"}. Transaction ID: ${pend.tid}`),'_blank'),'pr');
  mkbtn($('#pyA'),'🔓 Activate Pro',()=>activate($('#pyCode').value),'pr');
  mkbtn($('#pyC'),'Cancel and start over',()=>{if(confirm('Cancel this payment record?')){SV('pend',null);renderPay()}},'dng')}}
R.pay=renderPay;

/* ---------- online search: full songs only + videos ---------- */
const aud=t=>({id:'a'+t.id,title:t.title,artist:t.user?.name||'Unknown',album:'',dur:t.duration,artUrl:t.artwork?.['480x480']||t.artwork?.['150x150']||'',url:`${AUDIUS}/tracks/${t.id}/stream?app_name=LBMusic`,srcName:'Full',online:true,full:true,name:t.title,size:0});
runOnline=async function(q){const b=$('#sRes');
 if(!online()){b.innerHTML=empty('📡 You are offline.<br>Online search needs internet.<br>“My music” still works.');return}
 if(SM===2)return runVideos(q);
 b.innerHTML='<div class="spin"></div>';const out=[],my=++runOnline.n,jobs=[];
 jobs.push(fetch(q?`${AUDIUS}/tracks/search?query=${encodeURIComponent(q)}&app_name=LBMusic&limit=30`:`${AUDIUS}/tracks/trending?app_name=LBMusic&limit=30`).then(r=>r.json()).then(j=>(j.data||[]).forEach(t=>out.push(aud(t)))).catch(()=>0));
 if(X.JAMENDO_ID)jobs.push(fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${X.JAMENDO_ID}&format=json&limit=30&audioformat=mp32&${q?'search='+encodeURIComponent(q):'order=popularity_week'}`).then(r=>r.json()).then(j=>(j.results||[]).forEach(t=>out.push({id:'j'+t.id,title:t.name,artist:t.artist_name,album:t.album_name||'',dur:+t.duration,artUrl:t.image||'',url:t.audio,srcName:'Full',online:true,full:true,name:t.name,size:0}))).catch(()=>0));
 await Promise.all(jobs);if(my!==runOnline.n||SM!==1)return;
 if(!out.length){b.innerHTML=empty('No full songs found.<br>Try another name, or open the <b>🎬 Videos</b> tab.');return}
 b.innerHTML=`<h3 style="margin-bottom:6px">${q?'Online results':'🔥 Trending online'}</h3><p class="mut" style="margin-bottom:8px">Full songs. Tap ⬇ to save offline.</p>`;const w=document.createElement('div');b.append(w);fill(w,out)};
runOnline.n=0;
const _ss=setSM;
setSM=function(v){if(v===2){SM=2;$('#smA').classList.remove('on');$('#smB').classList.remove('on');$('#smC').classList.add('on');$('#q').placeholder='🎬  Search music videos…';renderSearch()}else{$('#smC').classList.remove('on');_ss(v)}};
const un=s=>{const t=document.createElement('textarea');t.innerHTML=s;return t.value};
let VN=0;
async function runVideos(q){const b=$('#sRes'),my=++VN;
 if(!X.YT_KEY){b.innerHTML=empty('Add your free YouTube key in lb-extra.js (YT_KEY) to search videos.');return}
 b.innerHTML='<div class="spin"></div>';
 try{const u=q?`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=20&q=${encodeURIComponent(q)}&key=${X.YT_KEY}`:`https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=GH&maxResults=20&key=${X.YT_KEY}`;
  const j=await (await fetch(u)).json();if(my!==VN||SM!==2)return;
  const items=(j.items||[]).map(i=>({id:i.id.videoId||i.id,t:un(i.snippet.title),c:un(i.snippet.channelTitle),th:i.snippet.thumbnails?.medium?.url||''}));
  if(!items.length){b.innerHTML=empty('No videos found.');return}
  b.innerHTML=`<h3 style="margin-bottom:8px">${q?'Videos':'🔥 Trending videos'}</h3>`;
  items.forEach(v=>{const d=document.createElement('div');d.className='row';d.innerHTML=`<div class="cv" style="width:88px;background:url(${v.th}) center/cover"></div><div class="si"><b>${esc(v.t)}</b><small>${esc(v.c)}</small></div>`;d.onclick=()=>openVideo(v.id,v.t,v.c);b.append(d)})
 }catch(e){b.innerHTML=empty('Could not load videos. Check your internet or key.')}}
let YP=null,VT=0,VL=[],VI=-1;
const ytReady=()=>new Promise((res,rej)=>{if(window.YT&&YT.Player)return res();const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';window.onYouTubeIframeAPIReady=res;s.onerror=rej;document.head.append(s)});
async function openVideo(id,title,ch){try{au.pause()}catch(e){}
 $('#vid').classList.add('on');$('#vT').textContent=title;$('#vL').innerHTML='<div class="mut">Looking for lyrics…</div>';VL=[];VI=-1;
 try{await ytReady()}catch(e){toast('Could not load the video player');$('#vid').classList.remove('on');return}
 if(YP&&YP.loadVideoById)YP.loadVideoById(id);else YP=new YT.Player('ytp',{videoId:id,playerVars:{playsinline:1,rel:0,modestbranding:1},events:{onReady:e=>e.target.playVideo()}});
 clearInterval(VT);VT=setInterval(vTick,300);vLyr(title)}
$('#vX').onclick=()=>{$('#vid').classList.remove('on');clearInterval(VT);try{YP.pauseVideo()}catch(e){}};
async function vLyr(title){try{const q=title.replace(/\(.*?\)|\[.*?\]|official|video|lyrics?|HD|4K/gi,' ').replace(/\s+/g,' ').trim();
 const r=await fetch('https://lrclib.net/api/search?q='+encodeURIComponent(q)),a=r.ok?await r.json():[];
 const j=a.find(x=>x.syncedLyrics)||a[0],t=j&&(j.syncedLyrics||j.plainLyrics);
 if(!t){$('#vL').innerHTML='<div class="mut">No lyrics found for this video</div>';return}
 VL=parseLRC(t);
 $('#vL').innerHTML=VL.length?VL.map(l=>`<p>${esc(l.x||'♪')}</p>`).join(''):`<div style="white-space:pre-wrap;font-weight:500;font-size:16px">${esc(t)}</div>`}catch(e){$('#vL').innerHTML='<div class="mut">Lyrics need internet</div>'}}
function vTick(){if(!YP||!YP.getCurrentTime||!VL.length)return;const t=YP.getCurrentTime()+.2;let i=-1;for(let k=0;k<VL.length;k++){if(VL[k].t<=t)i=k;else break}
 if(i!==VI){VI=i;const ps=$('#vL').querySelectorAll('p');ps.forEach((p,k)=>p.classList.toggle('cu',k===i));if(ps[i])ps[i].scrollIntoView({block:'center',behavior:'smooth'})}}

/* ---------- save online songs: free = limited, Pro = unlimited + art + lyrics ---------- */
saveOnline=async function(s){if(!s.full)return toast('Only “Full” songs can be saved');
 const n=S.songs.filter(x=>x.src==='link').length;
 if(!isPro()&&n>=X.FREE_SAVES)return proGate('Saving more than '+X.FREE_SAVES+' online songs');
 toast('Saving “'+s.title+'”…');
 try{const r=await fetch(s.url);if(!r.ok)throw 0;const bl=await r.blob();
  const f=new File([bl],`${s.artist} - ${s.title}.mp3`.replace(/[\\/:*?"<>|]/g,''),{type:bl.type||'audio/mpeg'});
  await addFiles([f],'link');
  const song=S.songs.find(x=>x.name===f.name&&x.size===f.size);
  if(song){song.title=s.title;song.artist=s.artist;song.album=s.album||'';
   if(isPro()&&s.artUrl){try{song.art=await smallArt(await (await fetch(s.artUrl)).blob())}catch(e){}}
   await dbPut(song);if(isPro())fetchLyr(song,false);refresh()}
 }catch(e){toast('The server blocked saving. You can still stream it.')}};

/* ---------- lyrics button (🎤): show / find / paste / export ---------- */
$('#bLy').onclick=()=>{const s=cur();if(!s)return toast('Play a song first');
 sheet('Lyrics',[
  {ic:'🎤',t:LY.on?'Hide lyrics':'Show lyrics',fn:()=>showLyr(!LY.on)},
  {ic:'🔎',t:'Find lyrics online',fn:()=>{showLyr(true);fetchLyr(s,true)}},
  {ic:'✍️',t:'Paste / add lyrics',fn:()=>lyricsEdit()},
  {ic:'📝',t:'Export lyrics'+(isPro()?'':' 👑'),fn:()=>{if(!isPro())return proGate('Exporting lyrics');const t=S.lyr[s.id];if(!t)return toast('No lyrics to export');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));a.download=s.title+(/\[\d+:\d+/.test(t)?'.lrc':'.txt');a.click()}},
  {ic:'🗑️',t:'Remove lyrics',fn:()=>{delete S.lyr[s.id];SV('lyr',S.lyr);renderLyr();toast('Lyrics removed')}}])};

/* ---------- SONG MAKER ---------- */
const ROWS=[['kick','Kick',0,0],['snare','Snare',0,0],['hat','Hi-hat',0,0],['bass','Bass',1,0],['clap','Clap',0,1],['tom','Tom',0,1],['lead','Lead',1,1],['pluck','Pluck',1,1]];
const SC={Minor:[0,3,7,10],Major:[0,4,7,11],Pentatonic:[0,2,4,7],Blues:[0,3,5,6]},FREE_SC=['Minor','Major'];
const BASE={bass:36,lead:60,pluck:72};
const KITS={Classic:{p:1,d:1,f:1},Trap:{p:.7,d:1.8,f:1.3,pro:1},Afro:{p:1.2,d:.7,f:.8,pro:1},'Lo-fi':{p:.9,d:1.2,f:.5,pro:1}};
const NN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
let MK=LS('mk',null)||{bpm:100,root:0,scale:'Minor',kit:'Classic',grid:{}};
if(!MK.len)MK.len=4;
const LENS=[1,2,3,4,5,6,8,10];
const M={on:false,step:0,next:0,t:0,ac:null,mst:null,nb:null};
const noiseBuf=ac=>{const b=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b};
function ensureAc(){if(!M.ac){M.ac=new AudioContext();M.mst=M.ac.createGain();M.mst.gain.value=.85;M.mst.connect(M.ac.destination);M.nb=noiseBuf(M.ac)}M.ac.resume();return M.ac}
function kit(){const k=KITS[MK.kit]||KITS.Classic;return k.pro&&!isPro()?KITS.Classic:k}
function hit(ac,dst,nb,id,t,deg,K){
 let g=ac.createGain();g.connect(dst);
 const env=(a,d,pk)=>{g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)};
 const osc=(type,f1,f2,dur)=>{const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f1,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);o.connect(g);o.start(t);o.stop(t+dur+.4)};
 const noise=(type,f,dur)=>{const s=ac.createBufferSource();s.buffer=nb;const q=ac.createBiquadFilter();q.type=type;q.frequency.value=f*K.f;s.connect(q);q.connect(g);s.start(t,Math.random()*.5);s.stop(t+dur+.1)};
 if(id==='kick'){env(.003,.4*K.d,1);osc('sine',160*K.p,42,.14)}
 else if(id==='snare'){env(.002,.2*K.d,.7);noise('highpass',1500,.2*K.d);osc('triangle',200*K.p,120,.08)}
 else if(id==='clap'){env(.002,.16*K.d,.7);noise('bandpass',1300,.16*K.d)}
 else if(id==='hat'){env(.001,.05*K.d,.4);noise('highpass',7500,.06*K.d)}
 else if(id==='tom'){env(.003,.3*K.d,.8);osc('sine',140*K.p,70,.2)}
 else{const m=BASE[id]+MK.root+SC[MK.scale][(deg-1)%4],f=440*Math.pow(2,(m-69)/12);
  const q=ac.createBiquadFilter();q.type='lowpass';q.frequency.value=(id==='bass'?700:id==='lead'?3000:2200)*K.f;g.disconnect();g.connect(q);q.connect(dst);
  const dur=id==='bass'?.28:id==='lead'?.22:.15;env(.005,dur,id==='bass'?.7:.35);osc(id==='bass'?'sawtooth':id==='lead'?'square':'triangle',f,0,dur)}}
function sched(ac,dst,nb,step,t){const K=kit(),sc=SC[MK.scale]?MK.scale:'Minor';if(!isPro()&&!FREE_SC.includes(sc))MK.scale='Minor';
 ROWS.forEach(([id,,,pr])=>{if(pr&&!isPro())return;const v=(MK.grid[id]||[])[step];if(v)hit(ac,dst,nb,id,t,v,K)})}
const mark=s=>document.querySelectorAll('#mkGrid .stp').forEach(b=>b.classList.toggle('hl',+b.dataset.s===s));
function mStart(){if(M.on)return;try{au.pause()}catch(e){}const ac=ensureAc();M.on=true;M.step=0;M.next=ac.currentTime+.05;
 M.t=setInterval(()=>{while(M.next<ac.currentTime+.15){const s=M.step,tt=M.next;sched(ac,M.mst,M.nb,s,tt);setTimeout(()=>mark(s),Math.max(0,(tt-ac.currentTime)*1000));M.next+=60/MK.bpm/4;M.step=(M.step+1)%16}},25);
 const b=$('#mkPlay');if(b)b.textContent='⏹ Stop'}
function mStop(){clearInterval(M.t);M.on=false;mark(-1);const b=$('#mkPlay');if(b)b.textContent='▶ Play'}
function wav(b){const ch=b.numberOfChannels,n=b.length,o=new DataView(new ArrayBuffer(44+n*ch*2)),w=(p,s)=>[...s].forEach((c,i)=>o.setUint8(p+i,c.charCodeAt(0)));
 w(0,'RIFF');o.setUint32(4,36+n*ch*2,true);w(8,'WAVEfmt ');o.setUint32(16,16,true);o.setUint16(20,1,true);o.setUint16(22,ch,true);o.setUint32(24,b.sampleRate,true);o.setUint32(28,b.sampleRate*ch*2,true);o.setUint16(32,ch*2,true);o.setUint16(34,16,true);w(36,'data');o.setUint32(40,n*ch*2,true);
 const d=[...Array(ch).keys()].map(i=>b.getChannelData(i));let p=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,d[c][i]));o.setInt16(p,v<0?v*32768:v*32767,true);p+=2}return new Blob([o],{type:'audio/wav'})}
/* Render ONE loop, then tile it to any length (fast + low memory, so 4-10 minute songs work on weak phones) */
async function renderWav(minutes){const sr=44100,spb=60/MK.bpm/4,loopLen=16*spb,tailLen=1.5,
 oc=new OfflineAudioContext(1,Math.ceil((loopLen+tailLen)*sr),sr),nb=noiseBuf(oc),mst=oc.createGain();mst.gain.value=.85;mst.connect(oc.destination);
 for(let s=0;s<16;s++)sched(oc,mst,nb,s,s*spb);
 const loop=(await oc.startRendering()).getChannelData(0),loopN=Math.round(loopLen*sr),total=Math.round(minutes*60*sr),out=new Int16Array(total);
 for(let at=0;at<total;at+=loopN){const n=Math.min(loop.length,total-at);for(let i=0;i<n;i++){const v=out[at+i]+Math.max(-1,Math.min(1,loop[i]))*32767;out[at+i]=v>32767?32767:v<-32768?-32768:v}}
 const fade=Math.min(total,sr*4);for(let i=0;i<fade;i++)out[total-1-i]=out[total-1-i]*(i/fade);
 const h=new DataView(new ArrayBuffer(44)),w=(p,t)=>[...t].forEach((c,i)=>h.setUint8(p+i,c.charCodeAt(0)));
 w(0,'RIFF');h.setUint32(4,36+total*2,true);w(8,'WAVEfmt ');h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,1,true);h.setUint32(24,sr,true);h.setUint32(28,sr*2,true);h.setUint16(32,2,true);h.setUint16(34,16,true);w(36,'data');h.setUint32(40,total*2,true);
 return new Blob([h,out],{type:'audio/wav'})}
function renderMaker(){const b=$('#mkBody'),pro=isPro();
 b.innerHTML=`<p class="mut">Tap the squares to build a beat. Tap pitched rows again to change the note. Press Play, then save it to your music.</p>
 <div class="fx"><span>Speed</span><input type="range" id="mkBpm" min="60" max="${pro?200:140}" value="${Math.min(MK.bpm,pro?200:140)}"><b id="mkB">${MK.bpm}</b></div>
 <div class="chips" id="mkKit"></div><div class="chips" id="mkSc"></div><div class="chips" id="mkRoot"></div><div id="mkGrid"></div>
 <div class="action"><button id="mkPlay">${M.on?'⏹ Stop':'▶ Play'}</button><button id="mkRnd">🎲 Random</button><button id="mkClr">🗑 Clear</button></div>
 <div class="mkl" style="margin-top:12px">Song length</div><div class="chips" id="mkLen"></div>
 <div class="action"><button id="mkSave">💾 Save to my music (${MK.len} min)</button></div>
 ${pro?'':'<p class="mut">👑 Pro: 8 tracks, Trap / Afro / Lo-fi kits, 4 scales, faster speed.</p>'}`;
 const chip=(box,t,on,fn)=>{const c=document.createElement('button');c.className='chip'+(on?' on':'');c.textContent=t;c.onclick=fn;$(box).append(c)};
 LENS.forEach(m=>chip('#mkLen',m+' min',MK.len===m,()=>{MK.len=m;SV('mk',MK);renderMaker()}));
 Object.keys(KITS).forEach(k=>chip('#mkKit',k+(KITS[k].pro?' 👑':''),MK.kit===k,()=>{if(KITS[k].pro&&!pro)return proGate(k+' kit');MK.kit=k;SV('mk',MK);renderMaker()}));
 Object.keys(SC).forEach(k=>chip('#mkSc',k+(FREE_SC.includes(k)?'':' 👑'),MK.scale===k,()=>{if(!FREE_SC.includes(k)&&!pro)return proGate(k+' scale');MK.scale=k;SV('mk',MK);renderMaker()}));
 NN.forEach((n,i)=>chip('#mkRoot',n,MK.root===i,()=>{MK.root=i;SV('mk',MK);renderMaker()}));
 const paint=(c,v,pt)=>{c.classList.toggle('on',!!v);c.textContent=pt&&v?v:''};
 const g=$('#mkGrid');
 ROWS.forEach(([id,lab,pt,pr])=>{const locked=pr&&!pro,r=document.createElement('div');r.className='mkr';r.innerHTML=`<div class="mkl">${lab}${locked?' 👑':''}</div>`;
  const sw=document.createElement('div');sw.className='mkc';
  for(let s=0;s<16;s++){const c=document.createElement('button');c.className='stp'+(s%4===0?' q':'');c.dataset.s=s;paint(c,(MK.grid[id]||[])[s]||0,pt);
   c.onclick=()=>{if(locked)return proGate('The '+lab+' track');const a=MK.grid[id]=MK.grid[id]||Array(16).fill(0);a[s]=pt?(a[s]+1)%5:(a[s]?0:1);paint(c,a[s],pt);SV('mk',MK);
    if(a[s]&&!M.on){const ac=ensureAc();hit(ac,M.mst,M.nb,id,ac.currentTime+.01,a[s],kit())}};
   sw.append(c)}
  r.append(sw);g.append(r)});
 $('#mkBpm').oninput=e=>{MK.bpm=+e.target.value;$('#mkB').textContent=MK.bpm;SV('mk',MK)};
 $('#mkPlay').onclick=()=>M.on?mStop():mStart();
 $('#mkClr').onclick=()=>{MK.grid={};SV('mk',MK);renderMaker()};
 $('#mkRnd').onclick=()=>{const gr={};ROWS.forEach(([id,,pt,pr])=>{if(pr&&!pro)return;gr[id]=Array.from({length:16},(_,s)=>{const r=Math.random();
   if(id==='kick')return(s%8===0||r<.12)?1:0;if(id==='snare'||id==='clap')return(s%8===4||r<.06)?1:0;if(id==='hat')return(s%2===0||r<.25)?1:0;if(id==='tom')return r<.1?1:0;return r<.3?1+Math.floor(Math.random()*4):0})});
  MK.grid=gr;SV('mk',MK);renderMaker()};
 $('#mkSave').onclick=async()=>{const t=prompt('Name your song','My Beat');if(!t)return;toast('Making your song…');
  try{toast('Making your '+MK.len+'-minute song…');const blob=await renderWav(MK.len),
   f=new File([blob],t.replace(/[\\/:*?"<>|]/g,'')+'.wav',{type:'audio/wav'});
   await addFiles([f],'file');const s=S.songs.find(x=>x.name===f.name&&x.size===f.size);
   if(s){s.title=t;s.artist='Me (LB Maker)';s.album='My Songs';await dbPut(s)}
   refresh();toast('Saved! Find it in Music → My Songs')}catch(e){toast('Could not make the song on this phone')}}}
R.maker=renderMaker;

/* ---------- start ---------- */
document.body.dataset.ic=S.set.ic||'round';
chk();addEventListener('visibilitychange',()=>{if(!document.hidden)chk()});
applyTheme();ui();
})();
