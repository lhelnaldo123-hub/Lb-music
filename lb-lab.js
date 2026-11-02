/* =====================================================================
   LB Music add-on  ·  Music Videos + Song Lab
   Load AFTER lb-extra.js  →  <script src="lb-lab.js"></script>
   Nothing in index.html is removed. This file only ADDS things.
   ===================================================================== */
(()=>{
if(window.__lbLab)return;window.__lbLab=1;
const $=s=>document.querySelector(s),
E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
AC=window.AudioContext||window.webkitAudioContext,SR=32000,
sleep=ms=>new Promise(r=>setTimeout(r,ms)),
fm=t=>{t=Math.round(t||0);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')},
kvPut=(id,blob)=>tx('kv','readwrite',k=>k.put({id,blob})),
kvGet=id=>tx('kv','readonly',k=>k.get(id)),
kvDel=id=>tx('kv','readwrite',k=>k.delete(id)),
dec=ab=>new OfflineAudioContext(2,1,SR).decodeAudioData(ab),
mtof=m=>440*Math.pow(2,(m-69)/12),
AUD='https://api.audius.co/v1';

/* ---------------- styles + DOM ---------------- */
const css=document.createElement('style');css.textContent=`
.lbtn{background:var(--card);border:1px solid #ffffff22;border-radius:14px;padding:11px 14px;font-size:13px;font-weight:700;color:#fff}
.lbtn.pr{background:var(--ac);color:#04201c;border:0}
.lbtn.rec{background:#e5384f;color:#fff;border:0}
.lc{background:var(--card);border-radius:18px;padding:14px;margin:12px 0}
.lh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.lh b{flex:1;font-size:16px}
#lab select,.lc select,#sheet select{width:auto;padding:8px;margin:0;border-radius:10px;background:#1b1f27;color:#fff;border:1px solid #2a303b;font-size:13px}
.lrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
.lc textarea{margin-top:10px;font-size:13px}
.sq{display:grid;grid-template-columns:repeat(16,1fr);gap:2px;margin:4px 0 10px}.sq i{height:24px;border-radius:4px;background:#ffffff18}.sq i.on{background:var(--ac)}.sq i:nth-child(4n+1){outline:1px solid #ffffff35}
.ok{color:var(--ac);font-size:12px;margin-top:8px}
#vid,#recov,#busy{position:fixed;inset:0;background:#0b0d11;display:none;flex-direction:column;padding:12px 14px calc(14px + env(safe-area-inset-bottom))}
#vid{z-index:120}#recov{z-index:130}#busy{z-index:140;align-items:center;justify-content:center;text-align:center;background:#0b0d11ee}
#vid.on,#recov.on{display:flex}#busy.on{display:flex}
.vh{display:flex;align-items:center;gap:10px;margin-bottom:8px}.vh b{flex:1;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vh a{color:var(--ac);font-size:12px}
#vF{width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;flex:none}#vF iframe{width:100%;height:100%;border:0}
#vErr{display:none;background:#3a1b1b;border-radius:12px;padding:10px;margin-top:8px;font-size:13px}#vErr a{color:var(--ac)}
.vb{display:flex;gap:8px;margin:10px 0;flex-wrap:wrap}
#vTabs{margin:2px 0 8px}#vRel{flex:1;min-height:0;overflow:auto;scrollbar-width:none}#vRel .row.done{opacity:.45}#vRel .row.now b{color:var(--ac)}
#vLy,#rLy{flex:1;overflow:auto;text-align:center;line-height:1.6;font-size:17px;font-weight:600;scrollbar-width:none;padding:8px}
#vLy p{color:#ffffff70;padding:4px 0;cursor:pointer}#vLy p.cu{color:#fff;font-size:20px}#vLy .pl{white-space:pre-wrap;font-weight:500;font-size:15px;color:#ddd}
#rLy{white-space:pre-wrap;font-size:19px}
#rBig{font-size:64px;text-align:center;margin:6px 0}
#rBar{height:5px;background:#ffffff22;border-radius:4px;overflow:hidden;margin:8px 0}#rBar i{display:block;height:100%;width:0;background:var(--ac)}
.rb{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;min-height:48px}
`;document.head.append(css);

/* lb-extra.js also made a #vid overlay and a 🎬 chip with the same ids -> the video was loading into a hidden copy. Remove the old ones. */
document.querySelectorAll('#vid,#smC').forEach(el=>el.remove());
document.body.insertAdjacentHTML('beforeend',`
<section id="lab" class="page"></section>
<div id="vid"><div class="vh"><button class="ib" id="vX">⌄</button><b id="vT"></b><a id="vYt" target="_blank" rel="noopener">YouTube ↗</a></div>
 <div id="vF"></div><div id="vErr">⚠️ This video does not allow playing inside apps. <a id="vYt2" target="_blank" rel="noopener">Open it on YouTube</a> or tap “Play song only”.</div>
 <div class="vb"><button class="lbtn" id="vShuf">🔀 Shuffle</button><button class="lbtn" id="vNext">⏭ Next</button><button class="lbtn" id="vAuto">⏭ Autoplay: On</button><button class="lbtn" id="vLb">🔎 Find lyrics</button><button class="lbtn pr" id="vAud">🎧 Play song only</button></div>
 <div class="chips" id="vTabs"><button class="chip on" data-t="rel">▶ Related songs</button><button class="chip" data-t="ly">🎤 Lyrics</button></div>
 <div id="vRel"></div><div id="vLy" style="display:none"></div></div>
<div id="recov"><div class="vh"><b id="rTitle"></b><button class="ib" id="rX">✕</button></div><div id="rLy"></div><div id="rBig">…</div><div id="rBar"><i></i></div><div class="rb" id="rBtns"></div><p class="mut" style="text-align:center;margin-top:8px">🎧 Use headphones so the beat is not picked up by the mic</p></div>
<div id="busy"><div class="spin"></div><h3 id="bMsg" style="margin-top:10px"></h3><p class="mut" style="margin-top:8px">Please keep the app open</p></div>`);
$('#nav').insertAdjacentHTML('beforeend','<button data-p="lab" onclick="show(\'lab\')"><span>🎙</span>Lab</button>');

/* =====================================================================
   PART 1 · MUSIC VIDEOS (music only, no API key needed)
   ===================================================================== */
const PIPED=['https://pipedapi.kavin.rocks','https://pipedapi.adminforge.de','https://api.piped.private.coffee','https://pipedapi.leptons.xyz','https://piped-api.garudalinux.org'],
INV=['https://yewtu.be','https://inv.nadeko.net','https://invidious.nerdvpn.de'];
let VID=false,VT,VCUR=null,VL,VLY=[],VLI=-1,VREL=[],VPLAYED=new Set(),VRT=0,VEND=0,VAUTO=LS('vauto',true);
async function ft(u,ms=7000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(u,{signal:c.signal})}finally{clearTimeout(t)}}
const un=s=>{const t=document.createElement('textarea');t.innerHTML=s;return t.value};
const thumb=id=>`https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
async function vsearch(q){
 const key=LS('ytkey','');
 if(key){try{const j=await(await ft(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=20&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`)).json();
  if(j.items&&j.items.length)return j.items.map(i=>({id:i.id.videoId,title:un(i.snippet.title),by:un(i.snippet.channelTitle),dur:0}))}catch(e){}}
 const okDur=d=>!d||d<=720;
 const tp=h=>ft(`${h}/search?q=${encodeURIComponent(q)}&filter=music_videos`).then(r=>r.ok?r.json():Promise.reject()).then(j=>{const it=(j.items||[]).filter(x=>x.url&&x.url.includes('watch?v=')&&okDur(x.duration)).map(x=>({id:x.url.split('v=')[1].split('&')[0],title:x.title,by:x.uploaderName||'',dur:x.duration}));return it.length?it:Promise.reject()});
 try{return await Promise.any(PIPED.map(tp))}catch(e){}
 const ti=h=>ft(`${h}/api/v1/search?type=video&q=${encodeURIComponent(q+' official music video')}`).then(r=>r.ok?r.json():Promise.reject()).then(j=>{const it=(Array.isArray(j)?j:[]).filter(x=>x.videoId&&okDur(x.lengthSeconds)).map(x=>({id:x.videoId,title:x.title,by:x.author||'',dur:x.lengthSeconds}));return it.length?it:Promise.reject()});
 try{return await Promise.any(INV.map(ti))}catch(e){}
 return null}
const YR=new Date().getFullYear(),
REG=[['','🌐 Global'],['GH','🇬🇭 Ghana'],['NG','🇳🇬 Nigeria'],['ZA','🇿🇦 South Africa'],['KE','🇰🇪 Kenya'],['TZ','🇹🇿 Tanzania'],['UG','🇺🇬 Uganda'],['CI','🇨🇮 Côte d’Ivoire'],['SN','🇸🇳 Senegal'],['CM','🇨🇲 Cameroon'],['EG','🇪🇬 Egypt'],['US','🇺🇸 USA'],['GB','🇬🇧 UK'],['JM','🇯🇲 Jamaica'],['BR','🇧🇷 Brazil'],['IN','🇮🇳 India'],['FR','🇫🇷 France']],
GEN=['Afrobeats','Amapiano','Highlife','Hiplife','Gospel','Hip hop','R&B','Dancehall','Reggae','Drill','Sad songs','Love songs','Party','Chill'],
ART=['Sarkodie','Kidi','Kuami Eugene','Black Sherif','King Promise','Stonebwoy','Shatta Wale','Burna Boy','Wizkid','Davido','Rema','Asake','Tyla','Diamond Platnumz','Lewis Capaldi','Ed Sheeran'];
let VREG=LS('vreg','GH');
const regName=c=>(REG.find(r=>r[0]===c)||['','Global'])[1].replace(/^\S+\s/,'');
async function appleChart(cc){if(!cc)return null;
 try{const r=await ft(`https://rss.applemarketingtools.com/api/v2/${cc.toLowerCase()}/music/most-played/30/songs.json`,8000);if(!r.ok)return null;const j=await r.json();
  const l=(j.feed&&j.feed.results||[]).map(x=>({name:x.name,artist:x.artistName,art:(x.artworkUrl100||'').replace('100x100','200x200')}));return l.length?l:null}catch(e){return null}}
async function playBySearch(term){toast('Finding the video…');const r=await vsearch(term);if(!r||!r.length)return toast('Could not find that video. Try again.');openVid(r[0])}
function chipsRow(arr,fn,cur){return arr.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return`<button class="chip${cur===v?' on':''}" data-v="${E(v)}">${E(l)}</button>`}).join('')}
async function runVid(){const b=$('#sRes'),q=$('#q').value.trim(),my=++runVid.n;
 if(!navigator.onLine){b.innerHTML='<div class="empty">📡 You are offline.<br>Videos need internet.</div>';return}
 const head=`<div class="lh"><h3 style="flex:1">${q?'🎬 Videos for “'+E(q)+'”':'🔥 Trending in '+E(regName(VREG))}</h3><button class="more" id="vKey">🔑 Key</button><button class="more" id="vLnk">🔗 Link</button></div>
 <div class="mut" style="margin:8px 0 4px">Country</div><div class="chips" id="vcReg" style="flex-wrap:nowrap;overflow-x:auto">${chipsRow(REG,0,VREG)}</div>
 <div class="mut" style="margin:6px 0 4px">Music type</div><div class="chips" id="vcGen" style="flex-wrap:nowrap;overflow-x:auto">${chipsRow(GEN,0,'')}</div>
 <div class="mut" style="margin:6px 0 4px">Artists</div><div class="chips" id="vcArt" style="flex-wrap:nowrap;overflow-x:auto">${chipsRow(ART,0,'')}</div>`;
 const wire=()=>{
  b.querySelectorAll('#vcReg .chip').forEach(x=>x.onclick=()=>{VREG=x.dataset.v;SV('vreg',VREG);$('#q').value='';runVid()});
  const go=t=>{$('#q').value=t;runVid()};
  b.querySelectorAll('#vcGen .chip').forEach(x=>x.onclick=()=>go(x.dataset.v+(VREG?' '+regName(VREG):'')+' songs official video '+YR));
  b.querySelectorAll('#vcArt .chip').forEach(x=>x.onclick=()=>go(x.dataset.v));
  const k=b.querySelector('#vKey');if(k)k.onclick=keySheet;const l=b.querySelector('#vLnk');if(l)l.onclick=linkVid};
 b.innerHTML=head+'<div class="spin"></div>';wire();
 const vq=q||(VREG?regName(VREG)+' trending music videos '+YR:'new music official video '+YR);
 const [ch,vr]=await Promise.all([q?null:appleChart(VREG),vsearch(vq)]);
 if(my!==runVid.n||!VID)return;
 let html=head;
 if(ch&&!q)html+=`<div class="sec"><h3>🏆 Top songs in ${E(regName(VREG))}</h3></div><p class="mut" style="margin:2px 0 8px">Tap a song to watch its video.</p><div id="vChart">${ch.map((c,i)=>`<div class="row" data-c="${i}"><div class="cv" style="background-image:url(${E(c.art)});width:52px;height:52px"></div><div class="si"><b>${E(c.name)}</b><small>${E(c.artist)}</small></div><button class="ib">▶</button></div>`).join('')}</div>`;
 if(vr&&vr.length)html+=`<div class="sec"><h3>${q?'Results':'🎬 Trending videos'}</h3></div><p class="mut" style="margin:2px 0 8px">Tap one to watch inside LB Music. Related songs from other artists show under the video.</p><div id="vVids">${vr.map((v,i)=>`<div class="row" data-i="${i}"><div class="cv" style="background-image:url(${thumb(v.id)});width:92px;height:52px"></div><div class="si"><b>${E(v.title)}</b><small>${E(v.by)}${v.dur?' · '+fm(v.dur):''}</small></div><button class="ib">▶</button></div>`).join('')}</div>`;
 else if(!ch)html+='<div class="empty">Could not reach the video search right now.<br>Try again, pick another country, or paste a YouTube link (🔗).</div>';
 b.innerHTML=html;wire();
 b.querySelectorAll('#vVids .row').forEach(x=>x.onclick=()=>openVid(vr[x.dataset.i]));
 if(ch)b.querySelectorAll('#vChart .row').forEach(x=>x.onclick=()=>{const c=ch[x.dataset.c];playBySearch(c.artist+' '+c.name+' official video')})}
runVid.n=0;
function keySheet(){const w=document.createElement('div');w.innerHTML=`<p class="mut" style="margin:6px 0">Optional. Without a key the app uses free public video search. With your own YouTube Data API key, search uses YouTube’s official music category.</p><input id="ykk" placeholder="Paste YouTube API key" value="${E(LS('ytkey',''))}">`;
 sheet('YouTube key (optional)',[{ic:'💾',t:'Save key',fn:()=>{SV('ytkey',$('#ykk').value.trim());toast('Saved ✅');runVid()}}],w)}
function linkVid(){const w=document.createElement('div');w.innerHTML='<input id="ylk" placeholder="Paste a YouTube link">';
 sheet('Open a YouTube link',[{ic:'▶',t:'Watch',fn:()=>{const m=$('#ylk').value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);if(!m)return toast('That is not a YouTube link');openVid({id:m[1],title:'YouTube video',by:''})}}],w)}
/* search chip + wrappers (nothing replaced, only wrapped) */
$('#smA').parentElement.insertAdjacentHTML('beforeend','<button class="chip" id="smC">🎬 Videos</button>');
const _setSM=window.setSM,_rs=window.renderSearch,_os=window.onSearch;
window.setSM=v=>{VID=false;$('#smC').classList.remove('on');_setSM(v)};
window.renderSearch=()=>{if(VID)return;_rs()};
window.onSearch=()=>{if(!VID)return _os();clearTimeout(VT);VT=setTimeout(runVid,650)};
$('#smC').onclick=()=>{VID=true;$('#smA').classList.remove('on');$('#smB').classList.remove('on');$('#smC').classList.add('on');$('#q').placeholder='🎬  Search music videos…';runVid()};
/* player */
function openVid(v,keep){try{au.pause()}catch(e){}VCUR=v;VLY=[];VLI=-1;
 $('#vid').classList.add('on');$('#vT').textContent=v.title;$('#vYt').href=$('#vYt2').href='https://www.youtube.com/watch?v='+v.id;$('#vErr').style.display='none';
 const org=location.protocol.startsWith('http')?'&origin='+encodeURIComponent(location.origin):'';
 $('#vF').innerHTML=`<iframe id="vIf" src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0&enablejsapi=1${org}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
 const f=$('#vIf');f.onload=()=>{let n=0;clearInterval(VL);VL=setInterval(()=>{try{f.contentWindow.postMessage(JSON.stringify({event:'listening',id:1,channel:'widget'}),'*')}catch(e){}if(++n>30)clearInterval(VL)},500)};
 vLyr(false);
 if(keep){VPLAYED.add(v.id);renderRel()}else{VPLAYED=new Set([v.id]);VREL=[];loadRel(v)}
 showTab('rel')}
function closeVid(){VRT++;$('#vid').classList.remove('on');$('#vF').innerHTML='';clearInterval(VL)}
$('#vX').onclick=closeVid;
/* ---- related / similar songs under the video ---- */
async function relatedOf(id){
 const ok=d=>!d||d<=720;
 const tp=h=>ft(`${h}/streams/${id}`,9000).then(r=>r.ok?r.json():Promise.reject()).then(j=>{const it=(j.relatedStreams||[]).filter(x=>x.url&&x.url.includes('watch?v=')&&ok(x.duration)).map(x=>({id:x.url.split('v=')[1].split('&')[0],title:x.title,by:x.uploaderName||'',dur:x.duration}));return it.length?it:Promise.reject()});
 try{return await Promise.any(PIPED.map(tp))}catch(e){}
 const ti=h=>ft(`${h}/api/v1/videos/${id}?fields=recommendedVideos`,9000).then(r=>r.ok?r.json():Promise.reject()).then(j=>{const it=(j.recommendedVideos||[]).filter(x=>x.videoId&&ok(x.lengthSeconds)).map(x=>({id:x.videoId,title:x.title,by:x.author||'',dur:x.lengthSeconds}));return it.length?it:Promise.reject()});
 try{return await Promise.any(INV.map(ti))}catch(e){}
 return[]}
const nm=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const sameArtist=(cur,x)=>{const k=nm(cur.a);if(k.length<3)return false;return nm(x.title).includes(k)||nm((x.by||'').replace(/ - Topic$|VEVO$|official/gi,'')).includes(k)||k.includes(nm((x.by||'').replace(/ - Topic$|VEVO$|official/gi,'')).slice(0,40))&&nm(x.by||'').length>3};
async function loadRel(v){const my=++VRT,b=$('#vRel');b.innerHTML='<div class="spin"></div><p class="mut" style="text-align:center">Finding songs like this…</p>';
 if(!navigator.onLine){b.innerHTML='<div class="empty">📡 You are offline.<br>Related songs need internet.</div>';return}
 const g=guess(v),cur={a:g.a||v.by||'',t:g.t};
 const jobs=[relatedOf(v.id),
  cur.a?vsearch('songs like '+cur.a+' official music video'):null,
  vsearch((VREG?regName(VREG)+' ':'')+'trending songs official music video '+YR)];
 const rs=await Promise.allSettled(jobs.map(j=>j||Promise.resolve([])));
 if(my!==VRT)return;
 const seen=new Set([v.id]),seenT=new Set([nm(cur.t)]),lists=rs.map(r=>r.status==='fulfilled'&&Array.isArray(r.value)?r.value.filter(x=>x&&x.id&&!sameArtist(cur,x)):[]);
 /* mix the three sources one by one so you get variety, never a single artist's catalogue */
 const out=[],per={};for(let i=0;i<20;i++)lists.forEach(l=>{const x=l[i];if(!x||seen.has(x.id)||seenT.has(nm(guess(x).t)))return;const who=nm(guess(x).a||x.by);if((per[who]=(per[who]||0)+1)>2)return;seen.add(x.id);seenT.add(nm(guess(x).t));out.push(x)});
 VREL=out.slice(0,36);renderRel()}
function renderRel(){const b=$('#vRel');
 if(!VREL.length){b.innerHTML='<div class="empty">No related songs found right now.<br>Try again in a moment.</div>';return}
 b.innerHTML='<p class="mut" style="margin:2px 0 6px">Songs like this by other artists · tap one to play</p>'+VREL.map((v,i)=>`<div class="row${VPLAYED.has(v.id)?' done':''}${VCUR&&VCUR.id===v.id?' now':''}" data-i="${i}"><div class="cv" style="background-image:url(${thumb(v.id)});width:92px;height:52px"></div><div class="si"><b>${E(v.title)}</b><small>${E(v.by)}${v.dur?' · '+fm(v.dur):''}</small></div><button class="ib">▶</button></div>`).join('');
 b.querySelectorAll('.row').forEach(x=>x.onclick=()=>openVid(VREL[x.dataset.i],true))}
function nextVid(){const n=VREL.find(x=>!VPLAYED.has(x.id));if(!n){toast('No more related songs');return}openVid(n,true)}
function showTab(t){$('#vRel').style.display=t==='rel'?'':'none';$('#vLy').style.display=t==='ly'?'':'none';
 document.querySelectorAll('#vTabs [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 if(t==='ly'){const c=$('#vLy').querySelector('p.cu');if(c)c.scrollIntoView({block:'center'})}}
document.querySelectorAll('#vTabs [data-t]').forEach(b=>b.onclick=()=>showTab(b.dataset.t));
$('#vShuf').onclick=()=>{const un=VREL.filter(x=>!VPLAYED.has(x.id)),pl=VREL.filter(x=>VPLAYED.has(x.id));
 for(let i=un.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[un[i],un[j]]=[un[j],un[i]]}
 VREL=[...un,...pl];renderRel();showTab('rel');toast('Shuffled 🔀')};
$('#vNext').onclick=nextVid;
const setAuto=()=>{$('#vAuto').textContent='⏭ Autoplay: '+(VAUTO?'On':'Off')};
$('#vAuto').onclick=()=>{VAUTO=!VAUTO;SV('vauto',VAUTO);setAuto()};setAuto();
addEventListener('message',e=>{if(!/youtube/.test(e.origin))return;let d;try{d=typeof e.data==='string'?JSON.parse(e.data):e.data}catch(x){return}if(!d)return;
 if(d.event==='infoDelivery'&&d.info&&typeof d.info.currentTime==='number')vTick(d.info.currentTime);
 if(d.event==='onError')$('#vErr').style.display='block';
 const ended=(d.event==='onStateChange'&&d.info===0)||(d.event==='infoDelivery'&&d.info&&d.info.playerState===0);
 if(ended&&VAUTO&&Date.now()-VEND>4000){VEND=Date.now();nextVid()}});
const clean=t=>t.replace(/\(.*?\)|\[.*?\]|official|music video|video|lyrics?|audio|\bhd\b|4k|m\/v/gi,'').replace(/\s+/g,' ').trim();
function guess(v){let t=v.title.replace(/\|.*$/,''),a=(v.by||'').replace(/ - Topic$|VEVO$/i,'').trim();const i=t.indexOf(' - ');if(i>0){a=clean(t.slice(0,i));t=clean(t.slice(i+3))}else t=clean(t);return{a,t:t.replace(/\s*(ft\.|feat\.).*$/i,'').trim()}}
const lrc=t=>{const o=[];(t||'').split('\n').forEach(l=>{const m=[...l.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)],x=l.replace(/\[[^\]]*\]/g,'').trim();m.forEach(a=>o.push({t:+a[1]*60+ +a[2],x}))});return o.sort((a,b)=>a.t-b.t)};
async function vLyr(force){const b=$('#vLy');if(!VCUR)return;const{a,t}=guess(VCUR);b.innerHTML='<div class="mut">Looking for lyrics…</div>';
 if(!navigator.onLine){b.innerHTML='<div class="mut">Lyrics need internet.</div>';return}
 try{let r=await fetch('https://lrclib.net/api/get?'+new URLSearchParams({track_name:t,artist_name:a})),j=r.ok?await r.json():null;
  if(!j){r=await fetch('https://lrclib.net/api/search?q='+encodeURIComponent((a+' '+t).trim()));const l=r.ok?await r.json():[];j=l[0]}
  const txt=j&&(j.syncedLyrics||j.plainLyrics);if(!txt){b.innerHTML='<div class="mut">No lyrics found for this video.</div>';return}
  const ln=lrc(txt);if(ln.length){VLY=ln;b.innerHTML=ln.map((l,i)=>`<p data-i="${i}">${E(l.x||'♪')}</p>`).join('')}else b.innerHTML=`<div class="pl">${E(txt)}</div>`}
 catch(e){b.innerHTML='<div class="mut">Could not reach the lyrics service.</div>'}}
function vTick(t){if(!VLY.length)return;let i=-1;for(let k=0;k<VLY.length;k++){if(VLY[k].t<=t+.25)i=k;else break}
 if(i!==VLI){VLI=i;const ps=$('#vLy').querySelectorAll('p');ps.forEach((p,k)=>p.classList.toggle('cu',k===i));if(ps[i])ps[i].scrollIntoView({block:'center',behavior:'smooth'})}}
$('#vLb').onclick=()=>vLyr(true);
$('#vAud').onclick=async()=>{if(!VCUR)return;const{a,t}=guess(VCUR);toast('Finding the song…');
 try{const j=await(await fetch(`${AUD}/tracks/search?query=${encodeURIComponent((a+' '+t).trim())}&app_name=LBMusic&limit=10`)).json();
  const l=(j.data||[]).map(x=>({id:'a'+x.id,title:x.title,artist:x.user?.name||'Unknown',album:'',dur:x.duration,artUrl:x.artwork?.['480x480']||'',url:`${AUD}/tracks/${x.id}/stream?app_name=LBMusic`,srcName:'Full',online:true,full:true,name:x.title,size:0}));
  if(!l.length)return toast('Full song not found online. Try 🌍 Online search or add it to your music.');
  closeVid();playOnline(l,0)}catch(e){toast('Could not reach the music server')}};
/* 🎬 button in the full player: watch the video of the song that is playing */
const _lyBtn=$('#bLy');if(_lyBtn)_lyBtn.insertAdjacentHTML('afterend','<button class="ib" id="bVid" title="Watch video">🎬</button>');
if($('#bVid'))$('#bVid').onclick=()=>{const s=cur();if(!s)return;closeFull();show('search');$('#q').value=((s.artist&&s.artist!=='Unknown artist')?s.artist+' ':'')+s.title;$('#smC').click()};

/* =====================================================================
   PART 2 · SONG LAB  (beats → verses/chorus/bridge → studio mix → export)
   ===================================================================== */
const ST={
 trap:{n:'Trap',bpm:140,k:'x.......x.x.....',s:'........x.......',h:'x.x.x.x.x.x.xxxx',c:'........x.......',b:'x.......x.x.....',L:4},
 drill:{n:'Drill',bpm:142,k:'x.....x...x.....',s:'........x.......',h:'x.x.x.xxx.x.x.xx',c:'........x.......',b:'x.....x.........',L:4},
 boombap:{n:'Boom Bap',bpm:90,k:'x.....x...x.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',c:'',b:'x.....x...x.....',L:2,sw:.3},
 lofi:{n:'Lo-fi chill',bpm:75,k:'x.....x...x.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',c:'',b:'x.......x.......',L:3,sw:.35,vin:1},
 afro:{n:'Afrobeat',bpm:105,k:'x..x..x...x..x..',s:'....x.......x...',h:'x.xxx.xxx.xxx.xx',c:'',b:'x..x..x...x..x..',L:2},
 piano:{n:'Amapiano',bpm:112,k:'x...x...x...x...',s:'....x.......x...',h:'..x...x...x...x.',c:'....x.......x...',b:'x..x..x...x..x..',L:2,log:1},
 pop:{n:'Pop',bpm:118,k:'x...x...x...x...',s:'',h:'..x...x...x...x.',c:'....x.......x...',b:'x...x...x...x...',L:2},
 rnb:{n:'R&B slow jam',bpm:78,k:'x.....x.....x...',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',c:'',b:'x.......x.......',L:4,sw:.2}
};
const styleOf=id=>ST[id]||LS('beats',{})[id]||ST.trap;
const FL={intro:{pad:1,keys:1,hat:1},verse:{kick:1,snare:1,hat:1,bass:1,pad:.5},chorus:{kick:1,snare:1,hat:1,bass:1,pad:1,keys:1,clap:1,open:1},bridge:{pad:1,bass:1,keys:1},outro:{pad:1,keys:1}};
const CH={m:[[0,0],[8,1],[3,1],[10,1]],M:[[0,1],[7,1],[9,0],[5,1]]};
const FX={'Clean Studio':{rev:.16,echo:.10,dbl:.28,pres:3,air:3,warm:0},'Warm Radio':{rev:.08,echo:.05,dbl:.18,pres:2,air:1,warm:3},'Big Hall':{rev:.34,echo:.16,dbl:.35,pres:3,air:4,warm:0},'Trap Echo':{rev:.14,echo:.28,dbl:.30,pres:4,air:3,warm:0},'Raw / Dry':{rev:0,echo:0,dbl:0,pres:0,air:0,warm:0}};
const KEYS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const TB={},EXT={},GUIDE=new Map();
let P=null,RES=null,BUSY=false,LC=null,LP=[];
const lc=()=>{LC=LC||new AC();LC.resume&&LC.resume();return LC};
const stopL=()=>{LP.forEach(x=>{try{x.stop()}catch(e){}});LP=[]};
const OA=new Audio();OA.ontimeupdate=()=>{if(OA.currentTime>30)OA.pause()};
const save=()=>{const l=LS('labp',[]).filter(x=>x.id!==P.id);l.unshift(P);SV('labp',l)};
const newSec=type=>({id:'s'+Date.now()+Math.random().toString(36).slice(2,5),type,bars:{verse:16,chorus:8,bridge:8,intro:4,outro:4}[type],lyrics:'',take:null,ref:null,style:null});
function autoLen(p){const T=p.target||240,bar=240/p.beat.bpm,tot=()=>p.sections.reduce((a,s)=>a+s.bars,0)*bar;let g=0;
 while(tot()<T&&g++<60){let ch=false;for(const s of p.sections){if(tot()>=T)break;const mx=s.type==='verse'?32:s.type==='chorus'?16:s.type==='bridge'?16:8;if(s.bars<mx){s.bars+=4;ch=true}}
  if(!ch){const i=p.sections.findIndex(s=>s.type==='outro');p.sections.splice(i<0?p.sections.length:i,0,newSec('verse'))}}}
function newProject(){const p={id:'p'+Date.now(),name:'My song',artist:'Me',beat:{kind:'gen',style:'boombap',bpm:90,key:0,mode:'m'},bg:{},vol:{beat:80,voc:100},fx:'Clean Studio',sync:100,target:240,
 sections:['intro','verse','chorus','verse','chorus','outro'].map(newSec)};autoLen(p);return p}
const tkOf=s=>s.ref?(P.sections.find(x=>x.id===s.ref)||{}).take:s.take;
const secName=i=>{const s=P.sections[i],n=P.sections.filter((x,k)=>x.type===s.type&&k<=i).length,c=P.sections.filter(x=>x.type===s.type).length,N={intro:'Intro',verse:'Verse',chorus:'Chorus',bridge:'Bridge',outro:'Outro'}[s.type];return c>1?N+' '+n:N};
const secStart=(p,i)=>p.sections.slice(0,i).reduce((a,s)=>a+s.bars*240/p.beat.bpm,0);

/* ---- beat engine (WebAudio synth, rendered offline) ---- */
function sched(oc,dest,p,t0,t1){
 const B=p.beat,bar=240/B.bpm,st=bar/16,gen=B.kind==='gen',Y0=gen?(B.tmp||styleOf(B.style)):{},bg=p.bg||{};let y=Y0;
 const N=oc.createBuffer(1,oc.sampleRate*2,oc.sampleRate),nd=N.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 const g=(v,t)=>{const x=oc.createGain();x.gain.setValueAtTime(v,t);x.connect(dest);return x};
 const tone=(t,type,f,d,v,att=.005)=>{const o=oc.createOscillator();o.type=type;o.frequency.value=f;const x=oc.createGain();x.gain.setValueAtTime(.0001,t);x.gain.linearRampToValueAtTime(v,t+att);x.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(x);x.connect(dest);o.start(t);o.stop(t+d+.05)};
 const nz=(t,d,type,f,v)=>{const s=oc.createBufferSource();s.buffer=N;const fl=oc.createBiquadFilter();fl.type=type;fl.frequency.value=f;const x=g(v,t);x.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(fl);fl.connect(x);s.start(t,Math.random());s.stop(t+d+.02)};
 const kick=(t,v)=>{const o=oc.createOscillator(),x=g(v,t);o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);x.gain.exponentialRampToValueAtTime(.001,t+.4);o.connect(x);o.start(t);o.stop(t+.45)};
 const snare=(t,v)=>{nz(t,.2,'bandpass',2000,v*.7);tone(t,'triangle',190,.12,v*.35)};
 const clap=(t,v)=>{for(let i=0;i<3;i++)nz(t+i*.011,.09,'bandpass',1500,v*.5)};
 const hat=(t,v,open)=>nz(t,open?.16:.04,'highpass',7500,v*.3);
 const bass=(t,m,len)=>{if(y.log){tone(t,'sine',mtof(m+12),.25,.9);nz(t,.02,'bandpass',900,.25)}else{tone(t,'sine',mtof(m),Math.max(.15,len),.95);tone(t,'triangle',mtof(m+12),len*.6,.12)}};
 const pad=(t,ns,d,v)=>{const f=oc.createBiquadFilter();f.type='lowpass';f.frequency.value=1300;const x=oc.createGain();x.gain.setValueAtTime(.0001,t);x.gain.linearRampToValueAtTime(v,t+.4);x.gain.setValueAtTime(v,t+d-.3);x.gain.linearRampToValueAtTime(.0001,t+d);f.connect(x);x.connect(dest);ns.forEach(m=>[-7,7].forEach(dt=>{const o=oc.createOscillator();o.type='sawtooth';o.frequency.value=mtof(m);o.detune.value=dt;o.connect(f);o.start(t);o.stop(t+d+.05)}))};
 if(!gen&&EXT[B.id]){const s=oc.createBufferSource();s.buffer=EXT[B.id];s.loop=true;const x=g(1,0);s.connect(x);s.start(0,t0%EXT[B.id].duration);s.stop(t1-t0)}
 if(y.vin||bg.vinyl){const s=oc.createBufferSource();s.buffer=N;s.loop=true;const f=oc.createBiquadFilter();f.type='bandpass';f.frequency.value=4000;const x=g(.018,0);s.connect(f);f.connect(x);s.start(0);s.stop(t1-t0)}
 const prog=CH[B.mode==='M'?'M':'m'];let pos=0;
 p.sections.forEach(sec=>{const s0=pos;pos+=sec.bars*bar;if(s0<t0-1e-6||s0>=t1-1e-6)return;
  y=gen&&sec.style&&(ST[sec.style]||LS('beats',{})[sec.style])?styleOf(sec.style):Y0;
  const f=Object.assign({},gen?FL[sec.type]:{});if(bg.pad)f.pad=1;if(bg.keys)f.keys=1;if(bg.shaker)f.shaker=1;
  for(let b=0;b<sec.bars;b++){const T0=s0-t0+b*bar,ch=prog[b%4],root=(B.key+ch[0])%12,cn=[0,ch[1]?4:3,7].map(x=>48+root+x),bm=36+root;
   if(f.pad)pad(T0,cn.map(x=>x+12),bar,f.pad===.5?.025:.045);
   for(let i=0;i<16;i++){const t=T0+i*st+((i%2&&y.sw)?y.sw*st*.6:0),on=pt=>pt&&pt[i]==='x';
    if(f.kick&&on(y.k))kick(t,1);if(f.snare&&on(y.s))snare(t,.9);if(f.clap&&on(y.c))clap(t,.7);
    if(f.hat&&on(y.h))hat(t,i%4?.55:.9,f.open&&i%8===6);
    if(f.bass&&on(y.b))bass(t,bm+(i===14&&b%2?7:0),(y.L||2)*st);
    if(f.keys&&i%2===0)tone(t,'triangle',mtof(cn[(i>>1)%3]+12),.4,.09);
    if(f.shaker)nz(t,.05,'highpass',9000,i%4===2?.07:.04)}
   if(f.snare&&b===sec.bars-1&&sec.type!=='outro')for(let i=12;i<16;i++)snare(T0+i*st,.3+(i-12)*.2)}})}
function mst(oc,fadeEnd){const c=oc.createDynamicsCompressor();c.threshold.value=-14;c.knee.value=12;c.ratio.value=3;c.attack.value=.01;c.release.value=.2;
 const m=oc.createGain();m.gain.value=.9;if(fadeEnd){m.gain.setValueAtTime(.9,Math.max(0,fadeEnd-4));m.gain.linearRampToValueAtTime(0,fadeEnd-.1)}c.connect(m);m.connect(oc.destination);return c}
const renderWin=(p,t0,t1)=>{const oc=new OfflineAudioContext(2,Math.max(1,Math.ceil((t1-t0)*SR)),SR);sched(oc,mst(oc),p,t0,t1);return oc.startRendering()};
async function ensureBeat(p){const B=p.beat;if(B.kind!=='ext'||EXT[B.id])return;let blob;
 if(B.from==='lib'){const r=await tx('blobs','readonly',b=>b.get(B.sid));blob=r&&r.blob}else{const r=await kvGet('beat_'+B.id);blob=r&&r.blob}
 if(!blob)throw new Error('beat missing');EXT[B.id]=await dec(await blob.arrayBuffer())}
async function takeBuf(id){if(TB[id])return TB[id];const r=await kvGet('take_'+id);if(!r)return null;return TB[id]=await dec(await r.blob.arrayBuffer())}
async function guideBuf(i){await ensureBeat(P);const sec=P.sections[i],s0=secStart(P,i),k=JSON.stringify([P.beat,P.bg,sec.type,sec.bars,sec.style||0,P.beat.kind==='ext'?s0:0]);
 if(GUIDE.has(k))return GUIDE.get(k);const b=await renderWin(P,s0,s0+sec.bars*240/P.beat.bpm);if(GUIDE.size>8)GUIDE.clear();GUIDE.set(k,b);return b}
function playBuf(buf){stopL();const c=lc(),s=c.createBufferSource();s.buffer=buf;s.connect(c.destination);s.start();LP=[s]}
function listenTake(guide,vb,off){stopL();const c=lc(),b=c.createBufferSource();b.buffer=guide;b.connect(c.destination);const v=c.createBufferSource();v.buffer=vb;const g=c.createGain();g.gain.value=1.3;v.connect(g);g.connect(c.destination);const t=c.currentTime+.1;b.start(t);v.start(t,Math.min(off,vb.duration-.01));LP=[b,v]}

/* ---- vocal studio chain + final mix ---- */
function ir(oc,sec){const n=Math.floor(oc.sampleRate*sec),b=oc.createBuffer(2,n,oc.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.8)}return b}
function vchain(oc,M,p){const fx=FX[p.fx]||FX['Clean Studio'],inp=oc.createGain(),bq=(type,f,gain,q)=>{const x=oc.createBiquadFilter();x.type=type;x.frequency.value=f;if(gain!=null)x.gain.value=gain;if(q)x.Q.value=q;return x};
 const hp=bq('highpass',95),e1=bq('peaking',300,-2,1),e2=bq('peaking',3000,fx.pres,.9),e3=bq('highshelf',10000,fx.air),e4=bq('lowshelf',200,fx.warm);
 const cm=oc.createDynamicsCompressor();cm.threshold.value=-26;cm.ratio.value=4;cm.knee.value=10;cm.attack.value=.006;cm.release.value=.18;
 const out=oc.createGain();out.gain.value=p.vol.voc/100*1.2;
 inp.connect(hp);hp.connect(e1);e1.connect(e2);e2.connect(e3);e3.connect(e4);e4.connect(cm);cm.connect(out);out.connect(M);
 if(fx.rev){const cv=oc.createConvolver();cv.buffer=ir(oc,1.9);const rw=oc.createGain();rw.gain.value=fx.rev;out.connect(cv);cv.connect(rw);rw.connect(M)}
 if(fx.echo){const dl=oc.createDelay(2);dl.delayTime.value=60/p.beat.bpm*.75;const fb=oc.createGain();fb.gain.value=.32;const lp=bq('lowpass',3200),ew=oc.createGain();ew.gain.value=fx.echo;out.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(ew);ew.connect(M)}
 return{inp,fx}}
async function mixProject(p){await ensureBeat(p);const bar=240/p.beat.bpm,total=p.sections.reduce((a,s)=>a+s.bars*bar,0),tail=2.5;
 const oc=new OfflineAudioContext(2,Math.ceil((total+tail)*SR),SR),M=mst(oc,total+tail),bb=oc.createGain();bb.gain.value=p.vol.beat/100;bb.connect(M);
 sched(oc,bb,p,0,total+tail);const V=vchain(oc,M,p);let pos=0;
 p.sections.forEach(sec=>{const s0=pos;pos+=sec.bars*bar;const tk=tkOf(sec),buf=tk&&TB[tk.id];if(!buf)return;
  const off=Math.min(tk.lead+(p.sync||0)/1000,buf.duration-.05),dur=Math.max(.1,Math.min(sec.bars*bar+1.2,buf.duration-off));
  const s=oc.createBufferSource();s.buffer=buf;s.connect(V.inp);s.start(s0,off,dur);
  if(V.fx.dbl)[-1,1].forEach(d=>{const s2=oc.createBufferSource();s2.buffer=buf;s2.detune.value=d*7;const pn=oc.createStereoPanner();pn.pan.value=d*.7;const gd=oc.createGain();gd.gain.value=V.fx.dbl*(sec.type==='chorus'?1:.4)*.6;s2.connect(gd);gd.connect(pn);pn.connect(V.inp);s2.start(s0+.02,off,dur)})});
 return oc.startRendering()}
function wav(buf){const ch=buf.numberOfChannels,n=buf.length,sr=buf.sampleRate,ab=new ArrayBuffer(44+n*ch*2),v=new DataView(ab),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
 w(0,'RIFF');v.setUint32(4,36+n*ch*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*ch*2,true);
 const d=[];for(let c=0;c<ch;c++)d.push(buf.getChannelData(c));let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,d[c][i]));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2}return new Blob([ab],{type:'audio/wav'})}

/* ---- recording ---- */
let RC=null;
async function record(i){const sec=P.sections[i];
 if(!navigator.mediaDevices||!window.MediaRecorder)return toast('Recording is not supported in this browser');
 let st;try{st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})}catch(e){return toast('Please allow the microphone to record')}
 try{au.pause()}catch(e){}stopL();
 const o=$('#recov'),big=$('#rBig'),bar=$('#rBar i'),btn=$('#rBtns');o.classList.add('on');$('#rTitle').textContent=secName(i)+' · '+sec.bars+' bars';
 $('#rLy').textContent=sec.lyrics||'(No lyrics written — just sing!)';btn.innerHTML='';big.textContent='…';
 let cancel=false;$('#rX').onclick=()=>{cancel=true;RC&&RC.stop()};
 const end=()=>{o.classList.remove('on');st.getTracks().forEach(t=>t.stop());stopL();renderLab()};
 let guide;try{guide=await guideBuf(i)}catch(e){end();return toast('Could not prepare the beat')}
 if(cancel){end();return}
 const ctx=lc();
 const attempt=async()=>{for(let n=3;n>0&&!cancel;n--){big.textContent=n;await sleep(800)}
  if(cancel)return null;big.textContent='🎙';btn.innerHTML='<button class="lbtn rec" id="rStop">⏹ Stop</button>';
  const mr=new MediaRecorder(st),ch=[];mr.ondataavailable=e=>e.data.size&&ch.push(e.data);const fin=new Promise(r=>mr.onstop=r);
  const t0=performance.now();mr.start();await sleep(150);
  const bs=ctx.createBufferSource();bs.buffer=guide;bs.connect(ctx.destination);const lead=(performance.now()-t0)/1000,ts=ctx.currentTime;bs.start();
  let over=false;const stop=()=>{if(over)return;over=true;try{bs.stop()}catch(e){}setTimeout(()=>{if(mr.state!=='inactive')mr.stop()},500)};
  bs.onended=stop;$('#rStop').onclick=stop;RC={stop};
  const tick=()=>{if(over)return;bar.style.width=Math.min(100,(ctx.currentTime-ts)/guide.duration*100)+'%';requestAnimationFrame(tick)};tick();
  await fin;RC=null;bar.style.width='0';
  const blob=new Blob(ch,{type:mr.mimeType||'audio/webm'});let vb;try{vb=await dec(await blob.arrayBuffer())}catch(e){toast('Could not read the recording');return null}
  return{blob,vb,lead}};
 for(;;){const r=await attempt();if(!r||cancel){end();return}
  big.textContent='✅';btn.innerHTML='<button class="lbtn" id="rL">▶ Listen</button><button class="lbtn pr" id="rS">💾 Save take</button><button class="lbtn" id="rR">🔁 Retry</button>';
  const a=await new Promise(res=>{$('#rL').onclick=()=>listenTake(guide,r.vb,r.lead+(P.sync||0)/1000);$('#rS').onclick=()=>res('s');$('#rR').onclick=()=>res('r');$('#rX').onclick=()=>res('x')});stopL();
  if(a==='s'){const id='t'+Date.now();if(sec.take)await kvDel('take_'+sec.take.id);await kvPut('take_'+id,r.blob);TB[id]=r.vb;sec.take={id,lead:r.lead,dur:r.vb.duration};sec.ref=null;save();toast('Take saved ✅');end();return}
  if(a==='x'){end();return}}}
async function listen(i){const sec=P.sections[i],tk=tkOf(sec);if(!tk)return;toast('Preparing…');try{const g=await guideBuf(i),vb=await takeBuf(tk.id);listenTake(g,vb,tk.lead+(P.sync||0)/1000)}catch(e){toast('Could not play this part')}}

/* ---- beat picker + beat maker ---- */
function beatSheet(){const w=document.createElement('div');let tab=0;
 const useGen=id=>{const y=styleOf(id);P.beat={kind:'gen',style:id,bpm:y.bpm,key:P.beat.key||0,mode:P.beat.mode||'m'};save();closeSheet();renderLab()};
 const useExt=async(o,getBlob)=>{toast('Loading beat…');try{const blob=await getBlob();if(o.from!=='lib')await kvPut('beat_'+o.id,blob);EXT[o.id]=await dec(await blob.arrayBuffer());
  P.beat={kind:'ext',id:o.id,from:o.from,sid:o.sid,name:o.name,bpm:P.beat.bpm||90,key:P.beat.key||0,mode:P.beat.mode||'m'};save();closeSheet();renderLab();toast('Beat ready. Set the BPM to match it 🥁')}catch(e){toast('Could not load that beat')}};
 const prev=async b=>{toast('Playing a preview…');try{playBuf(await renderWin({beat:b,bg:{},vol:{beat:80,voc:100},sections:[{type:'chorus',bars:4}]},0,4*240/b.bpm))}catch(e){toast('Preview failed')}};
 const draw=()=>{OA.pause();w.innerHTML=`<div class="chips">${['Built-in','My beats','My music','Online','Upload'].map((t,i)=>`<button class="chip${tab===i?' on':''}" data-t="${i}">${t}</button>`).join('')}</div><div id="bsb"></div>`;
  w.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=+b.dataset.t;draw()});const b=w.querySelector('#bsb');
  if(tab<2){const list=tab===0?Object.entries(ST):Object.entries(LS('beats',{}));
   b.innerHTML=(tab===1&&!list.length?'<div class="empty">No beats made yet.</div>':'')+list.map(([id,y])=>`<div class="row"><div class="si"><b>${E(y.n)}</b><small>${y.bpm} BPM</small></div><button class="ib" data-p="${id}">▶</button><button class="lbtn" data-u="${id}">Use</button></div>`).join('')+(tab===1?'<button class="lbtn pr" id="mk" style="width:100%;margin-top:8px">🎛 Make a new beat</button>':'');
   b.querySelectorAll('[data-p]').forEach(x=>x.onclick=()=>prev({kind:'gen',style:x.dataset.p,bpm:styleOf(x.dataset.p).bpm,key:P.beat.key||0,mode:P.beat.mode||'m'}));
   b.querySelectorAll('[data-u]').forEach(x=>x.onclick=()=>useGen(x.dataset.u));const mk=b.querySelector('#mk');if(mk)mk.onclick=()=>{closeSheet();setTimeout(makerSheet,60)}}
  else if(tab===2){b.innerHTML='<input id="bq" placeholder="Filter your songs…"><div id="bl"></div>';
   const fl=()=>{const q=b.querySelector('#bq').value.toLowerCase(),l=S.songs.filter(s=>(s.title+s.artist).toLowerCase().includes(q)).slice(0,40);
    b.querySelector('#bl').innerHTML=l.map(s=>`<div class="row"><div class="si"><b>${E(s.title)}</b><small>${E(s.artist)} · ${fm(s.dur)}</small></div><button class="lbtn" data-s="${s.id}">Use</button></div>`).join('')||'<div class="empty">No songs yet</div>';
    b.querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{const s=S.songs.find(z=>z.id===x.dataset.s);useExt({id:'lib_'+s.id,from:'lib',sid:s.id,name:s.title},async()=>(await tx('blobs','readonly',k=>k.get(s.id))).blob)})};
   b.querySelector('#bq').oninput=fl;fl()}
  else if(tab===3){b.innerHTML='<input id="oq" placeholder="e.g. afrobeat instrumental"><button class="lbtn pr" id="og" style="width:100%">🔎 Search beats online</button><div id="ol"></div>';
   const go=async()=>{const q=b.querySelector('#oq').value.trim()||'type beat',ol=b.querySelector('#ol');ol.innerHTML='<div class="spin"></div>';
    try{const j=await(await fetch(`${AUD}/tracks/search?query=${encodeURIComponent(/beat|instrumental/i.test(q)?q:q+' instrumental beat')}&app_name=LBMusic&limit=20`)).json(),l=j.data||[],su=t=>`${AUD}/tracks/${t.id}/stream?app_name=LBMusic`;
     ol.innerHTML=l.map((t,k)=>`<div class="row"><div class="si"><b>${E(t.title)}</b><small>${E(t.user?.name||'')} · ${fm(t.duration)}</small></div><button class="ib" data-p="${k}">▶</button><button class="lbtn" data-u="${k}">Use</button></div>`).join('')||'<div class="empty">No beats found</div>';
     ol.querySelectorAll('[data-p]').forEach(x=>x.onclick=()=>{stopL();OA.src=su(l[x.dataset.p]);OA.play().catch(()=>{})});
     ol.querySelectorAll('[data-u]').forEach(x=>x.onclick=()=>{const t=l[x.dataset.u];OA.pause();useExt({id:'a'+t.id,from:'online',name:t.title},async()=>{const r=await fetch(su(t));if(!r.ok)throw 0;return r.blob()})})}
    catch(e){ol.innerHTML='<div class="empty">Could not reach the beat store. Check your internet.</div>'}};
   b.querySelector('#og').onclick=go;go()}
  else{b.innerHTML='<p class="mut" style="margin:8px 0">Choose a beat or instrumental stored on your phone.</p><button class="lbtn pr" id="up" style="width:100%">📂 Choose audio file</button>';
   b.querySelector('#up').onclick=()=>{const f=document.createElement('input');f.type='file';f.accept='audio/*';f.onchange=()=>{const x=f.files[0];if(x)useExt({id:'u'+Date.now(),from:'file',name:x.name.replace(/\.[^.]+$/,'')},async()=>x)};f.click()}}};
 sheet('Choose your beat',[],w);draw()}
function makerSheet(){const w=document.createElement('div'),R5=[['k','Kick'],['s','Snare'],['h','Hi-hat'],['c','Clap'],['b','808 bass']],pat={},fromS=y=>R5.forEach(([k])=>pat[k]=[...(y[k]||'').padEnd(16,'.')].map(c=>c==='x'));fromS(ST.boombap);
 w.innerHTML=`<input id="mn" value="My beat" placeholder="Beat name"><label class="mut">BPM <input id="mb" type="number" value="90" min="50" max="200" style="width:90px;display:inline-block"></label><p class="mut" style="margin:8px 0">Start from a style, then tap the squares:</p><div class="chips">${Object.entries(ST).map(([id,y])=>`<button class="chip" data-s="${id}">${y.n}</button>`).join('')}</div>${R5.map(([k,l])=>`<div class="mut">${l}</div><div class="sq" data-r="${k}">${'<i></i>'.repeat(16)}</div>`).join('')}`;
 const paint=()=>R5.forEach(([k])=>w.querySelectorAll(`[data-r="${k}"] i`).forEach((el,i)=>el.classList.toggle('on',pat[k][i])));
 w.querySelectorAll('.sq i').forEach(el=>el.onclick=()=>{const r=el.parentElement.dataset.r,i=[...el.parentElement.children].indexOf(el);pat[r][i]=!pat[r][i];paint()});
 w.querySelectorAll('[data-s]').forEach(c=>c.onclick=()=>{const y=ST[c.dataset.s];fromS(y);w.querySelector('#mb').value=y.bpm;paint()});paint();
 const mk=()=>{const o={n:w.querySelector('#mn').value.trim()||'My beat',bpm:Math.max(50,Math.min(200,+w.querySelector('#mb').value||90)),L:3};R5.forEach(([k])=>o[k]=pat[k].map(x=>x?'x':'.').join(''));return o};
 sheet('🎛 Make your beat',[
  {ic:'▶',t:'Preview',keep:1,fn:async()=>{const o=mk();toast('Playing a preview…');try{playBuf(await renderWin({beat:{kind:'gen',style:'_tmp',tmp:o,bpm:o.bpm,key:P.beat.key||0,mode:P.beat.mode||'m'},bg:{},vol:{beat:80,voc:100},sections:[{type:'chorus',bars:4}]},0,4*240/o.bpm))}catch(e){toast('Preview failed')}}},
  {ic:'💾',t:'Save & use this beat',fn:()=>{const o=mk(),id='c'+Date.now(),bt=LS('beats',{});bt[id]=o;SV('beats',bt);P.beat={kind:'gen',style:id,bpm:o.bpm,key:P.beat.key||0,mode:P.beat.mode||'m'};save();renderLab();toast('Beat saved 🥁')}}],w)}

/* ---- Lab page ---- */
const sel=(f,opts,val,i)=>`<select data-f="${f}"${i!=null?` data-i="${i}"`:''}>${opts.map(([v,l])=>`<option value="${v}"${String(v)===String(val)?' selected':''}>${l}</option>`).join('')}</select>`;
function secHTML(s,i){const bar=240/P.beat.bpm,tk=tkOf(s),src=P.sections.slice(0,i).find(x=>x.type===s.type&&x.take&&x.id!==s.id),si=src?P.sections.indexOf(src):-1;
 return`<div class="lc"><div class="lh"><b>${secName(i)}</b>${sel('bars',[4,8,12,16,20,24,28,32].map(n=>[n,n+' bars']),s.bars,i)}<span class="mut">${fm(s.bars*bar)}</span>${P.beat.kind==='gen'?sel('style',[['','Same beat'],...Object.keys(ST).map(k=>[k,'Beat: '+ST[k].n])],s.style||'',i):''}<button class="ib" data-a="up" data-i="${i}">⬆</button><button class="ib" data-a="dn" data-i="${i}">⬇</button><button class="ib" data-a="rm" data-i="${i}">✕</button></div>
 <textarea data-f="lyr" data-i="${i}" rows="2" placeholder="Write your lyrics here (optional)…">${E(s.lyrics)}</textarea>
 <div class="ok">${s.ref?'🔁 Using '+secName(P.sections.findIndex(x=>x.id===s.ref)):tk?'✅ Recorded ('+fm(tk.dur)+')':'<span class="mut">No vocal yet</span>'}</div>
 <div class="lrow">${s.ref?`<button class="lbtn" data-a="own" data-i="${i}">🎤 Sing a new one</button>`:`<button class="lbtn rec" data-a="rec" data-i="${i}">🎙 ${tk?'Re-record':'Record'}</button>`}${tk?`<button class="lbtn" data-a="ls" data-i="${i}">▶ Listen</button>`:''}${tk&&!s.ref?`<button class="lbtn" data-a="del" data-i="${i}">🗑</button>`:''}${!s.ref&&si>=0&&!s.take?`<button class="lbtn" data-a="reuse" data-i="${i}" data-v="${src.id}">🔁 Reuse ${secName(si)}</button>`:''}</div></div>`}
function renderLab(){if(BUSY)return;const r=$('#lab');
 if(!P){const l=LS('labp',[]);r.innerHTML=`<div class="top"><h1>Song Lab</h1><button class="ic ac" data-a="new">+</button></div><p class="mut" style="line-height:1.6">Pick or make a beat, record each verse, chorus and bridge, then the Lab mixes a studio-style song you can listen to, add to your music and export.</p>${l.map((p,i)=>`<div class="row" data-a="open" data-i="${i}"><div class="cv" style="background:linear-gradient(135deg,#7a5cff,#1de9c6)">🎙</div><div class="si"><b>${E(p.name)}</b><small>${p.sections.filter(s=>s.take||s.ref).length}/${p.sections.length} parts recorded</small></div><button class="ib" data-a="delp" data-i="${i}">🗑</button></div>`).join('')}<button class="lbtn pr" data-a="new" style="width:100%;margin-top:14px">＋ Start a new song</button>`;return}
 const TG=P.target||240,B=P.beat,gen=B.kind==='gen',bar=240/B.bpm,tot=P.sections.reduce((a,s)=>a+s.bars*bar,0),bgs=[['pad','🎹 Warm pad'],['keys','🎼 Melody keys'],['shaker','🥁 Shaker'],['vinyl','📻 Vinyl']];
 r.innerHTML=`<div class="top"><button class="ic" data-a="home">‹</button><h3 style="flex:1;margin-left:10px">Song Lab</h3></div>
 <input data-f="name" value="${E(P.name)}" placeholder="Song title"><input data-f="artist" value="${E(P.artist)}" placeholder="Artist name">
 <div class="lc"><div class="lh"><b>🥁 ${E(gen?styleOf(B.style).n:B.name)}</b><button class="lbtn" data-a="beat">Change beat</button></div>
  <div class="lrow"><label class="mut">BPM <input type="number" data-f="bpm" value="${B.bpm}" min="50" max="200" style="width:80px;display:inline-block"></label>${sel('key',KEYS.map((k,i)=>[i,k]),B.key||0)}${sel('mode',[['m','Minor (emotional)'],['M','Major (happy)']],B.mode||'m')}</div>
  <div class="lrow"><button class="lbtn" data-a="maker">🎛 Make my own beat</button></div></div>
 ${P.sections.map(secHTML).join('')}
 <div class="lc"><b>➕ Add a part</b><div class="lrow">${['intro','verse','chorus','bridge','outro'].map(t=>`<button class="lbtn" data-a="add" data-v="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <div class="ok" style="margin-top:10px">Song length: <b>${fm(tot)}</b>${tot<TG?' · under '+Math.round(TG/60)+' min':''}</div>
  <div class="lrow"><span class="mut">Target length</span>${sel('target',[[120,'2 min'],[180,'3 min'],[240,'4 min'],[300,'5 min'],[360,'6 min'],[480,'8 min'],[600,'10 min']],TG)}${tot<TG?'<button class="lbtn" data-a="long">⏱ Make it '+Math.round(TG/60)+'+ min</button>':''}</div></div>
 <div class="lc"><b>🎚 Background music</b><div class="chips" style="margin:10px 0 0">${bgs.map(([k,l])=>`<button class="chip${P.bg[k]?' on':''}" data-a="bg" data-v="${k}">${l}</button>`).join('')}</div></div>
 <div class="lc"><b>🎤 Studio voice effect</b><div class="chips" style="margin:10px 0 0">${Object.keys(FX).map(k=>`<button class="chip${P.fx===k?' on':''}" data-a="fx" data-v="${k}">${k}</button>`).join('')}</div>
  <div class="fx"><span>Beat volume</span><input type="range" data-f="vb" min="20" max="120" value="${P.vol.beat}"><b>${P.vol.beat}%</b></div>
  <div class="fx"><span>Voice volume</span><input type="range" data-f="vv" min="40" max="160" value="${P.vol.voc}"><b>${P.vol.voc}%</b></div>
  <div class="fx"><span>Mic sync</span><input type="range" data-f="sy" min="0" max="400" step="10" value="${P.sync}"><b>${P.sync}ms</b></div>
  <p class="mut">If your voice sounds late against the beat, raise Mic sync (Bluetooth needs more).</p></div>
 <button class="lbtn pr" data-a="create" style="width:100%;padding:16px;font-size:16px">🎶 Create my song</button>
 ${RES?`<div class="lc"><b>🎉 Your song is ready</b><audio controls src="${RES.url}" style="width:100%;margin-top:10px"></audio><div class="lrow"><button class="lbtn pr" data-a="resAdd">➕ Add to my music</button><button class="lbtn" data-a="resDl">⬇ Download</button><button class="lbtn" data-a="resSh">📤 Share</button></div></div>`:''}`}
function setField(t){const f=t.dataset.f,i=+t.dataset.i,v=t.value;if(!P)return;
 if(f==='name')P.name=v;else if(f==='artist')P.artist=v;else if(f==='bpm')P.beat.bpm=Math.max(50,Math.min(200,+v||90));
 else if(f==='key')P.beat.key=+v;else if(f==='mode')P.beat.mode=v;else if(f==='bars')P.sections[i].bars=+v;else if(f==='lyr')P.sections[i].lyrics=v;else if(f==='style')P.sections[i].style=v||null;
 else if(f==='target'){P.target=+v;autoLen(P)}else if(f==='vb')P.vol.beat=+v;else if(f==='vv')P.vol.voc=+v;else if(f==='sy')P.sync=+v;else return;
 save();if(['vb','vv','sy'].includes(f)){const b=t.parentElement.querySelector('b');if(b)b.textContent=v+(f==='sy'?'ms':'%')}
 if(f==='bpm'||f==='bars'||f==='target')renderLab()}
async function act(a,i,v){i=+i;
 if(a==='new'){P=newProject();RES=null;save();renderLab()}
 else if(a==='open'){P=LS('labp',[])[i];RES=null;renderLab()}
 else if(a==='delp'){if(!confirm('Delete this song project and its recordings?'))return;const l=LS('labp',[]),p=l[i];for(const s of p.sections)if(s.take)await kvDel('take_'+s.take.id);l.splice(i,1);SV('labp',l);renderLab()}
 else if(a==='home'){stopL();P=null;renderLab()}
 else if(a==='beat')beatSheet();else if(a==='maker')makerSheet();
 else if(a==='add'){P.sections.push(newSec(v));save();renderLab()}
 else if(a==='up'&&i>0){[P.sections[i-1],P.sections[i]]=[P.sections[i],P.sections[i-1]];save();renderLab()}
 else if(a==='dn'&&i<P.sections.length-1){[P.sections[i+1],P.sections[i]]=[P.sections[i],P.sections[i+1]];save();renderLab()}
 else if(a==='rm'){if(!confirm('Remove '+secName(i)+'?'))return;const s=P.sections[i];if(s.take)await kvDel('take_'+s.take.id);P.sections.forEach(x=>{if(x.ref===s.id)x.ref=null});P.sections.splice(i,1);save();renderLab()}
 else if(a==='rec')record(i);else if(a==='ls')listen(i);
 else if(a==='del'){const s=P.sections[i];if(s.take){await kvDel('take_'+s.take.id);s.take=null;save();renderLab()}}
 else if(a==='reuse'){P.sections[i].ref=v;save();renderLab()}else if(a==='own'){P.sections[i].ref=null;save();renderLab()}
 else if(a==='long'){autoLen(P);save();renderLab()}
 else if(a==='bg'){P.bg[v]=!P.bg[v];save();renderLab()}else if(a==='fx'){P.fx=v;save();renderLab()}
 else if(a==='create')create();
 else if(a==='resAdd'){await addFiles([new File([RES.blob],RES.name,{type:'audio/wav'})],'lab')}
 else if(a==='resDl'){const l=document.createElement('a');l.href=RES.url;l.download=RES.name;l.click()}
 else if(a==='resSh'){try{const f=new File([RES.blob],RES.name,{type:'audio/wav'});if(navigator.canShare?.({files:[f]}))await navigator.share({files:[f],title:P.name});else toast('Sharing not supported here — use Download')}catch(e){}}}
async function create(){if(!P.sections.some(s=>tkOf(s)))return toast('Record at least one part first 🎙');
 stopL();BUSY=true;$('#busy').classList.add('on');const msg=$('#bMsg');msg.textContent='Preparing your recordings…';
 try{await ensureBeat(P);for(const s of P.sections){const tk=tkOf(s);if(tk&&!TB[tk.id])await takeBuf(tk.id)}
  msg.textContent='Mixing your song like a studio…';await sleep(80);const buf=await mixProject(P);msg.textContent='Finishing…';await sleep(30);
  const blob=wav(buf);if(RES)URL.revokeObjectURL(RES.url);RES={blob,url:URL.createObjectURL(blob),name:`${P.artist||'Me'} - ${P.name||'My song'}.wav`.replace(/[\\/:*?"<>|]/g,'')};toast('Your song is ready 🎉')}
 catch(e){console.error(e);toast('Could not create the song. Try fewer parts or a shorter song.')}
 BUSY=false;$('#busy').classList.remove('on');renderLab();setTimeout(()=>window.scrollTo(0,document.body.scrollHeight),80)}
const lab=$('#lab');
lab.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)act(b.dataset.a,b.dataset.i,b.dataset.v)});
lab.addEventListener('input',e=>{const f=e.target.dataset.f;if(['name','artist','lyr','vb','vv','sy'].includes(f))setField(e.target)});
lab.addEventListener('change',e=>{const f=e.target.dataset.f;if(f&&!['name','artist','lyr','vb','vv','sy'].includes(f))setField(e.target)});

/* ---- Online tab: African & world genre chips + bridge to videos (works with whatever runOnline is by now) ---- */
const _ro=window.runOnline;
if(typeof _ro==='function'){
 const OGEN=['Afrobeats','Amapiano','Highlife','Hiplife','Azonto','Gospel','Afro house','Naija','Reggae','Dancehall','Hip hop','R&B','Lo-fi','Chill'];
 const wr=async function(q){await _ro(q);if(typeof SM!=='undefined'&&SM!==1)return;const b=$('#sRes');if(!b||b.querySelector('#oBar'))return;
  const bar=document.createElement('div');bar.id='oBar';
  bar.innerHTML=`<div class="mut" style="margin:2px 0 4px">Browse by type</div><div class="chips" style="flex-wrap:nowrap;overflow-x:auto">${OGEN.map(g=>`<button class="chip" data-g="${E(g)}">${E(g)}</button>`).join('')}</div>
   <div class="lc" style="margin:8px 0"><b>🎬 Looking for ${q?'“'+E(q)+'”':'big African and world hits'}?</b><div class="mut" style="margin:4px 0 8px">Most famous artists (Sarkodie, Kidi, Kuami Eugene, Burna Boy…) are not on this free music server. Watch their official videos instead, with trending songs for every country.</div><button class="lbtn pr" id="oVid">🎬 Open Videos${q?' for this search':''}</button></div>`;
  const oc=LS('onc','');
  bar.insertAdjacentHTML('afterbegin',`<div class="mut" style="margin:2px 0 4px">🌍 Trending by country</div><div class="chips" id="ocReg" style="flex-wrap:nowrap;overflow-x:auto">${REG.map(r=>`<button class="chip${oc===r[0]?' on':''}" data-c="${r[0]}">${E(r[1])}</button>`).join('')}</div><div class="mut" style="margin:6px 0 4px">🎤 Artists</div><div class="chips" id="ocArt" style="flex-wrap:nowrap;overflow-x:auto">${ART.map(g=>`<button class="chip" data-g="${E(g)}">${E(g)}</button>`).join('')}</div>`);
  bar.querySelectorAll('#ocReg [data-c]').forEach(x=>x.onclick=()=>{SV('onc',x.dataset.c);$('#q').value='';wr('')});
  bar.querySelectorAll('#ocArt [data-g]').forEach(x=>x.onclick=()=>{$('#q').value=x.dataset.g;wr(x.dataset.g)});
  b.prepend(bar);
  bar.querySelectorAll('[data-g]').forEach(x=>x.onclick=()=>{$('#q').value=x.dataset.g;wr(x.dataset.g)});
  bar.querySelector('#oVid').onclick=()=>{$('#smC').click()}};
 wr.n=_ro.n||0;window.runOnline=wr;
}
/* online song menu: also offer the full video */
const _osh=window.onlineSheet;
if(typeof _osh==='function')window.onlineSheet=function(s){_osh(s);const sh=$('#sheet'),c=sh&&sh.querySelector('.sclose');if(!c)return;const b=document.createElement('button');b.className='sitem';b.innerHTML='<span>🎬</span>Watch full video';b.onclick=()=>{closeSheet();playBySearch(s.artist+' '+s.title+' official video')};sh.insertBefore(b,c)};
R.lab=renderLab;

/* =====================================================================
   PART 3 · MY VIDEOS  (videos from your phone: saved inside the app,
   play offline, shuffle / repeat, and go through your Sound Studio EQ)
   ===================================================================== */
const vcss=document.createElement('style');vcss.textContent=`
#vp{position:fixed;inset:0;z-index:125;background:#000;display:none;flex-direction:column;padding:12px 14px calc(14px + env(safe-area-inset-bottom))}#vp.on{display:flex}
#vpV{width:100%;max-height:58vh;background:#000;border-radius:12px;flex:none}
#vp .ib{width:52px;height:52px;font-size:26px;color:#fff;border-radius:16px;background:rgba(255,255,255,.09)}
#vp .ib.on-ac{background:var(--ac);color:#04201c!important}
`;document.head.append(vcss);
document.body.insertAdjacentHTML('beforeend',`
<section id="videos" class="page"><div class="top"><button class="ic" onclick="back()">‹</button><h3 style="flex:1;margin-left:12px">🎬 My videos</h3><button class="ic ac" id="vAdd">+</button></div>
 <div class="lrow" style="margin:0 0 10px"><button class="lbtn pr" id="vlShuf">🔀 Shuffle play</button><button class="lbtn" id="vlAll">▶ Play all</button><button class="lbtn" id="vlLnk">🔗 From link</button></div>
 <p class="mut" style="margin-bottom:8px">Videos you add are saved inside LB Music, play offline, and use your Sound Studio equalizer and booster.</p>
 <div id="vlList"></div></section>
<div id="vp"><div class="vh"><button class="ib" id="vpX" style="width:40px;height:40px;font-size:20px">⌄</button><b id="vpT"></b></div><video id="vpV" playsinline controls></video>
 <div class="lrow" style="justify-content:center;gap:14px;margin-top:16px"><button class="ib" id="vpSh">🔀</button><button class="ib" id="vpPr">⏮</button><button class="ib" id="vpNx">⏭</button><button class="ib" id="vpRp">🔁</button></div>
 <p class="mut" style="text-align:center;margin-top:12px" id="vpN"></p></div>
<input type="file" id="vFile" accept="video/*,.mp4,.mkv,.webm,.3gp,.mov,.m4v" multiple hidden>`);
$('.action').insertAdjacentHTML('afterend','<div class="action"><button onclick="show(\'videos\')">🎬<br>My videos</button></div>');

let VLIB=LS('vlib',[]),VQ=[],VQI=-1,VSH=LS('vshuf',false),VRP=LS('vrep',1),VSRC=false,VURL=null;
const vsave=()=>SV('vlib',VLIB),vpEl=$('#vp'),pv=$('#vpV'),VIDRE=/\.(mp4|mkv|webm|3gp|mov|m4v)$/i;
function vthumb(file){return new Promise(res=>{const u=URL.createObjectURL(file),v=document.createElement('video');v.muted=true;v.preload='metadata';v.playsInline=true;let done=false;
 const fin=(d,t)=>{if(done)return;done=true;URL.revokeObjectURL(u);res({dur:isFinite(d)?d:0,th:t||''})};
 v.onloadedmetadata=()=>{const d=isFinite(v.duration)?v.duration:0;try{v.currentTime=Math.min(1,d/4)||0.1}catch(e){fin(d,'')}};
 v.onseeked=()=>{try{const c=document.createElement('canvas');c.width=160;c.height=90;c.getContext('2d').drawImage(v,0,0,160,90);fin(v.duration,c.toDataURL('image/jpeg',.6))}catch(e){fin(v.duration,'')}};
 v.onerror=()=>fin(0,'');setTimeout(()=>fin(v.duration,''),6000);v.src=u})}
async function addVideos(files){let n=0;
 for(const f of files){if(!(f.type.startsWith('video/')||VIDRE.test(f.name)))continue;if(VLIB.some(x=>x.key===f.name+'|'+f.size))continue;
  try{const id='v'+Date.now()+Math.random().toString(36).slice(2,5),m=await vthumb(f);await kvPut('vid_'+id,f);
   VLIB.unshift({id,key:f.name+'|'+f.size,title:f.name.replace(/\.[^.]+$/,'').replace(/_+/g,' '),size:f.size,dur:m.dur,th:m.th,added:Date.now()});vsave();n++;renderVideos();toast('Adding videos… '+n)}
  catch(e){toast('Not enough storage on this phone for that video');break}}
 toast(n?n+' video'+(n>1?'s':'')+' added 🎬':'Nothing new to add')}
function renderVideos(){const b=$('#vlList');
 if(!VLIB.length){b.innerHTML='<div class="empty">🎬<br>No videos yet.<br>Tap <b>+</b> to add videos from your phone.</div>';return}
 b.innerHTML=VLIB.map((v,i)=>`<div class="row" data-i="${i}"><div class="cv" style="width:92px;height:52px;background:${v.th?'url('+v.th+') center/cover':'#222'}">${v.th?'':'🎬'}</div><div class="si"><b>${E(v.title)}</b><small>${v.dur?fm(v.dur)+' · ':''}${(v.size/1048576).toFixed(0)} MB</small></div><button class="ib" data-m="${i}">⋮</button></div>`).join('');
 b.querySelectorAll('.row').forEach(x=>x.onclick=()=>vPlayList(+x.dataset.i));
 b.querySelectorAll('[data-m]').forEach(x=>x.onclick=e=>{e.stopPropagation();vMenu(VLIB[+x.dataset.m])})}
function vMenu(v){sheet(E(v.title),[
 {ic:'✏️',t:'Rename',fn:()=>{const n=prompt('Video name',v.title);if(n){v.title=n;vsave();renderVideos()}}},
 {ic:'🗑️',t:'Delete from app',fn:async()=>{if(!confirm('Delete "'+v.title+'" from LB Music?'))return;await kvDel('vid_'+v.id);VLIB=VLIB.filter(x=>x!==v);vsave();renderVideos()}}])}
function vFx(){try{initAudio();if(!ctx)return;if(!VSRC){ctx.createMediaElementSource(pv).connect(gP);VSRC=true}ctx.resume&&ctx.resume()}catch(e){}}
function vUI(){$('#vpSh').classList.toggle('on-ac',VSH);$('#vpRp').classList.toggle('on-ac',VRP>0);$('#vpRp').textContent=VRP===2?'🔂':'🔁'}
async function loadV(){const m=VLIB.find(x=>x.id===VQ[VQI]);if(!m)return;const r=await kvGet('vid_'+m.id);if(!r||!r.blob){toast('That video file is missing');return}
 try{au.pause()}catch(e){}stopL();
 if(VURL)URL.revokeObjectURL(VURL);VURL=URL.createObjectURL(r.blob);pv.src=VURL;
 $('#vpT').textContent=m.title;$('#vpN').textContent=(VQI+1)+' of '+VQ.length;vpEl.classList.add('on');vFx();vUI();try{await pv.play()}catch(e){}}
function vPlayList(i){VQ=VLIB.map(x=>x.id);VQI=i;loadV()}
function vStep(dir){if(!VQ.length)return;if(VSH&&VQ.length>1){let n;do{n=Math.floor(Math.random()*VQ.length)}while(n===VQI);VQI=n}else VQI=(VQI+dir+VQ.length)%VQ.length;loadV()}
pv.onended=()=>{if(VRP===2){pv.currentTime=0;pv.play()}else if(VRP===1||VSH||VQI<VQ.length-1)vStep(1)};
$('#vpX').onclick=()=>{pv.pause();vpEl.classList.remove('on')};
$('#vpSh').onclick=()=>{VSH=!VSH;SV('vshuf',VSH);vUI();toast(VSH?'Shuffle on':'Shuffle off')};
$('#vpRp').onclick=()=>{VRP=(VRP+1)%3;SV('vrep',VRP);vUI();toast(['Repeat off','Repeat all','Repeat one'][VRP])};
$('#vpNx').onclick=()=>vStep(1);
$('#vpPr').onclick=()=>{if(pv.currentTime>4){pv.currentTime=0;return}vStep(-1)};
$('#vAdd').onclick=()=>$('#vFile').click();
$('#vFile').onchange=e=>{addVideos([...e.target.files]);e.target.value=''};
$('#vlShuf').onclick=()=>{if(!VLIB.length)return toast('Add a video first');VSH=true;SV('vshuf',true);vPlayList(Math.floor(Math.random()*VLIB.length))};
$('#vlAll').onclick=()=>{if(!VLIB.length)return toast('Add a video first');VSH=false;SV('vshuf',false);vPlayList(0)};
$('#vlLnk').onclick=()=>{const w=document.createElement('div');w.innerHTML='<input id="vlu" placeholder="Direct video file link (https://…mp4)"><p class="mut" id="vlp" style="margin:10px 0">Only for video files you are allowed to save. Page links (YouTube, Facebook…) do not work.</p>';
 sheet('Save a video from a link',[{ic:'⬇️',t:'Download & save',keep:1,fn:async()=>{const u=$('#vlu').value.trim();if(!u)return;const p=$('#vlp');p.textContent='Downloading…';
  try{const r=await fetch(u);if(!r.ok)throw 0;const len=+r.headers.get('content-length')||0,rd=r.body.getReader(),ch=[];let got=0;
   for(;;){const{done,value}=await rd.read();if(done)break;ch.push(value);got+=value.length;p.textContent=len?'Downloading '+Math.round(got/len*100)+'%':'Downloaded '+(got/1048576).toFixed(1)+' MB'}
   let name=decodeURIComponent(new URL(u).pathname.split('/').pop())||'video.mp4';if(!VIDRE.test(name))name+='.mp4';
   closeSheet();await addVideos([new File(ch,name,{type:'video/mp4'})])}
  catch(e){p.textContent='That site did not allow the download. Save the video to your phone normally, then add it with +.'}}}],w)};
R.videos=renderVideos;
})();
