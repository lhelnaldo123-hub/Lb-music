/* =====================================================================
   LB Studio  ·  FL-Studio-style music maker for LB Music
   Patterns (drum grid + piano roll) → Arranger → Mixer → WAV export.
   Everything is synthesised in the browser: no sample files needed.
   Load AFTER lb-lab.js.
   ===================================================================== */
(()=>{
if(window.__lbStudio)return;window.__lbStudio=1;
const AC=window.AudioContext||window.webkitAudioContext;
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mtof=m=>440*Math.pow(2,(m-69)/12);
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hstr=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const fmt=t=>{t=Math.max(0,Math.round(t||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};

/* ---------- music data ---------- */
const NN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SCL={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],pent:[0,3,5,7,10],blues:[0,3,5,6,7,10]};
const SCN={minor:'Minor (sad / emotional)',major:'Major (happy)',dorian:'Dorian (smooth)',pent:'Pentatonic (easy)',blues:'Blues'};
const INST={
 kick:{n:'Kick',k:'d'},snare:{n:'Snare',k:'d'},clap:{n:'Clap',k:'d'},hat:{n:'Hi-hat',k:'d'},ohat:{n:'Open hat',k:'d'},
 tom:{n:'Tom',k:'d'},rim:{n:'Rim shot',k:'d'},shaker:{n:'Shaker',k:'d'},conga:{n:'Conga',k:'d'},
 sub:{n:'Sub bass',k:'s',base:36,sc:.9},b808:{n:'808 bass',k:'s',base:36,sc:.95},logdrum:{n:'Log drum',k:'s',base:48,sc:.9},
 keys:{n:'Keys (e-piano)',k:'s',base:60,sc:.55},pad:{n:'Warm pad',k:'s',base:48,sc:.5},lead:{n:'Lead synth',k:'s',base:72,sc:.4},
 pluck:{n:'Pluck / guitar',k:'s',base:60,sc:.6},bell:{n:'Bells',k:'s',base:72,sc:.5}};
const KITS={Classic:{kp:1,kd:1,sf:1,sd:1,hf:1},Trap:{kp:.8,kd:1.7,sf:1.1,sd:.9,hf:1.15},'Boom bap':{kp:1,kd:.9,sf:.8,sd:1.1,hf:.9},Afro:{kp:1.1,kd:.8,sf:1.2,sd:.8,hf:1},'Lo-fi':{kp:.9,kd:1.1,sf:.6,sd:1.2,hf:.55},Pop:{kp:1.05,kd:.9,sf:1.1,sd:1,hf:1.05}};
const ROOMS={small:{n:'Small',s:.7,d:.6},room:{n:'Room',s:1.2,d:.5},plate:{n:'Plate',s:1.7,d:.3},hall:{n:'Hall',s:2.4,d:.8},big:{n:'Cathedral',s:3.6,d:.9}};

/* ---------- synthesis (all sounds are made from oscillators + noise) ---------- */
const mkNoise=ac=>{const b=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=b.getChannelData(0),r=mulberry(4242);for(let i=0;i<d.length;i++)d[i]=r()*2-1;return b};
function G_(ac,dst,t,peak,att,dec){const g=ac.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(Math.max(.0002,peak),t+att);g.gain.exponentialRampToValueAtTime(.0001,t+att+dec);g.connect(dst);return g}
function osc(ac,type,f,t,end,out){const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.connect(out);o.start(t);o.stop(end);return o}
function nz(ac,G,dst,t,type,f,q,peak,att,dec){const s=ac.createBufferSource();s.buffer=G.nb;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.value=f;if(q)fl.Q.value=q;const g=G_(ac,dst,t,peak,att,dec);s.connect(fl);fl.connect(g);s.start(t,Math.random()*1.5);s.stop(t+att+dec+.05)}
const DR={
 kick(ac,G,d,t,v,K){const j=1+(Math.random()-.5)*.03,g=G_(ac,d,t,v,.002,.4*K.kd),o=osc(ac,'sine',160*K.kp*j,t,t+.5*K.kd+.05,g);o.frequency.exponentialRampToValueAtTime(46*K.kp,t+.11);
  const g2=G_(ac,d,t,v*.32,.001,.014),o2=osc(ac,'triangle',950,t,t+.04,g2);o2.frequency.exponentialRampToValueAtTime(110,t+.014)},
 snare(ac,G,d,t,v,K){nz(ac,G,d,t,'bandpass',1900*K.sf,.8,v*.8,.001,.17*K.sd);nz(ac,G,d,t,'highpass',5500,.5,v*.22,.001,.1*K.sd);
  const g=G_(ac,d,t,v*.4,.001,.1),o=osc(ac,'triangle',195*K.kp,t,t+.2,g);o.frequency.exponentialRampToValueAtTime(125,t+.09)},
 clap(ac,G,d,t,v,K){for(let i=0;i<3;i++)nz(ac,G,d,t+i*.011,'bandpass',1350*K.sf,1.1,v*.6,.001,.02);nz(ac,G,d,t+.033,'bandpass',1250*K.sf,.9,v*.55,.002,.17*K.sd)},
 hat(ac,G,d,t,v,K){nz(ac,G,d,t,'highpass',7800*K.hf,.7,v*.34,.001,.04*K.sd)},
 ohat(ac,G,d,t,v,K){nz(ac,G,d,t,'highpass',7200*K.hf,.7,v*.3,.002,.26*K.sd)},
 tom(ac,G,d,t,v,K){const g=G_(ac,d,t,v*.8,.002,.3),o=osc(ac,'sine',150*K.kp,t,t+.4,g);o.frequency.exponentialRampToValueAtTime(88,t+.15)},
 rim(ac,G,d,t,v,K){const g=G_(ac,d,t,v*.5,.001,.035);osc(ac,'triangle',1750,t,t+.06,g);nz(ac,G,d,t,'bandpass',3200,1,v*.25,.001,.03)},
 shaker(ac,G,d,t,v,K){nz(ac,G,d,t,'bandpass',6500,1.2,v*.3,.012,.05)},
 conga(ac,G,d,t,v,K){const g=G_(ac,d,t,v*.7,.002,.17),o=osc(ac,'sine',340,t,t+.25,g);o.frequency.exponentialRampToValueAtTime(255,t+.09);nz(ac,G,d,t,'bandpass',1300,1,v*.12,.001,.03)}};
function hold(g,t,v,dur,rel){g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.008);g.gain.setValueAtTime(v,t+Math.max(.02,dur));g.gain.exponentialRampToValueAtTime(.0001,t+dur+rel)}
const SY={
 sub(ac,G,d,t,f,dur,v){const g=ac.createGain();g.connect(d);hold(g,t,v*.9,dur,.1);const e=t+dur+.2;osc(ac,'sine',f,t,e,g);const g2=ac.createGain();g2.gain.value=.14;g2.connect(g);osc(ac,'triangle',f*2,t,e,g2)},
 b808(ac,G,d,t,f,dur,v){const len=Math.max(dur,.3)+.35,g=G_(ac,d,t,v,.003,len),o=osc(ac,'sine',f*2.2,t,t+len+.1,g);o.frequency.exponentialRampToValueAtTime(f,t+.05)},
 logdrum(ac,G,d,t,f,dur,v){const g=G_(ac,d,t,v,.002,.32),o=osc(ac,'sine',f*1.7,t,t+.4,g);o.frequency.exponentialRampToValueAtTime(f,t+.035);const g2=G_(ac,d,t,v*.25,.002,.16);osc(ac,'sine',f*2,t,t+.25,g2)},
 keys(ac,G,d,t,f,dur,v){const g=ac.createGain();g.connect(d);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v*.55,t+.004);g.gain.exponentialRampToValueAtTime(v*.2,t+.5);g.gain.setTargetAtTime(.0001,t+Math.max(.1,dur),.14);
  const c=osc(ac,'sine',f,t,t+dur+1.2,g),mg=ac.createGain();mg.gain.setValueAtTime(f*1.6,t);mg.gain.exponentialRampToValueAtTime(f*.04,t+.55);mg.connect(c.frequency);osc(ac,'sine',f,t,t+dur+1.2,mg);
  const g3=ac.createGain();g3.gain.value=.07;g3.connect(g);osc(ac,'sine',f*2,t,t+dur+1.2,g3)},
 bell(ac,G,d,t,f,dur,v){const g=G_(ac,d,t,v*.45,.003,1.5),c=osc(ac,'sine',f,t,t+1.6,g),mg=ac.createGain();mg.gain.setValueAtTime(f*2.6,t);mg.gain.exponentialRampToValueAtTime(f*.1,t+.9);mg.connect(c.frequency);osc(ac,'sine',f*3.5,t,t+1.6,mg)},
 pad(ac,G,d,t,f,dur,v){const lp=ac.createBiquadFilter();lp.type='lowpass';lp.Q.value=.4;lp.frequency.setValueAtTime(800,t);lp.frequency.linearRampToValueAtTime(1900,t+Math.min(dur,1.2));const g=ac.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v*.3,t+.28);g.gain.setValueAtTime(v*.3,t+Math.max(.3,dur));g.gain.exponentialRampToValueAtTime(.0001,t+dur+.6);
  lp.connect(g);g.connect(d);[-8,8].forEach(c=>{const o=osc(ac,'sawtooth',f,t,t+dur+.7,lp);o.detune.value=c})},
 lead(ac,G,d,t,f,dur,v){const lp=ac.createBiquadFilter();lp.type='lowpass';lp.Q.value=2.5;lp.frequency.setValueAtTime(Math.min(9000,f*7),t);lp.frequency.exponentialRampToValueAtTime(Math.min(4500,f*3),t+.3);const g=ac.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v*.5,t+.012);g.gain.setValueAtTime(v*.38,t+Math.max(.05,dur));g.gain.exponentialRampToValueAtTime(.0001,t+dur+.16);
  lp.connect(g);g.connect(d);[-6,6].forEach(c=>{const o=osc(ac,'sawtooth',f,t,t+dur+.2,lp);o.detune.value=c})},
 pluck(ac,G,d,t,f,dur,v){const lp=ac.createBiquadFilter();lp.type='lowpass';lp.Q.value=1;lp.frequency.setValueAtTime(Math.min(10000,f*12),t);lp.frequency.exponentialRampToValueAtTime(f*2.2,t+.3);const g=G_(ac,d,t,v*.75,.002,.45);lp.connect(g);
  osc(ac,'triangle',f,t,t+.6,lp);const g2=ac.createGain();g2.gain.value=.4;g2.connect(lp);osc(ac,'sawtooth',f,t,t+.6,g2)}};

/* ---------- reverb impulse (smooth, darkening tail) ---------- */
function makeIR(ac,sec,damp){const sr=ac.sampleRate,n=Math.floor(sr*sec),pre=Math.floor(sr*.012),b=ac.createBuffer(2,n+pre,sr);
 for(let c=0;c<2;c++){const d=b.getChannelData(c),r=mulberry(977*(c+1)+13);let lp=0;
  for(let i=0;i<n;i++){const x=i/n,env=Math.pow(1-x,2.3)*Math.exp(-x*1.1),k=.5+.42*Math.min(1,x*1.6)*damp;lp=lp*k+(r()*2-1)*(1-k);d[pre+i]=lp*env}}
 return b}
const curve=(amt)=>{const n=1024,c=new Float32Array(n),k=1+amt*.35;for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(k*x)/Math.tanh(k)}return c};
const satCurve=curve(2);

/* ---------- audio graph: channel strips → master ---------- */
function mkGraph(ac,P,lite){
 const G={ac,strips:{},nb:null,room:null},M=P.master,bq=(t,f)=>{const x=ac.createBiquadFilter();x.type=t;x.frequency.value=f;return x};
 const useRev=!lite||(M.rev>0&&P.chans.some(c=>c.rev>0)),useDly=!lite||(M.dly>0&&P.chans.some(c=>c.dly>0));
 G.mIn=ac.createGain();G.bass=bq('lowshelf',120);G.air=bq('highshelf',8000);G.lp=bq('lowpass',20000);G.lp.Q.value=.5;
 G.comp=ac.createDynamicsCompressor();G.sat=ac.createWaveShaper();G.sat.curve=satCurve;
 G.lim=ac.createDynamicsCompressor();G.lim.threshold.value=-2.5;G.lim.knee.value=0;G.lim.ratio.value=20;G.lim.attack.value=.002;G.lim.release.value=.12;
 G.vol=ac.createGain();
 G.mIn.connect(G.bass);G.bass.connect(G.air);G.air.connect(G.lp);G.lp.connect(G.comp);G.comp.connect(G.sat);G.sat.connect(G.lim);G.lim.connect(G.vol);G.vol.connect(ac.destination);
 G.rIn=ac.createGain();G.rOut=ac.createGain();
 if(useRev){G.conv=ac.createConvolver();G.rIn.connect(G.conv);G.conv.connect(G.rOut);G.rOut.connect(G.mIn)}
 G.dIn=ac.createGain();G.dOut=ac.createGain();
 if(useDly){G.dl=ac.createDelay(2);G.fb=ac.createGain();G.fb.gain.value=.34;G.dlp=bq('lowpass',3000);G.dIn.connect(G.dl);G.dl.connect(G.dlp);G.dlp.connect(G.dOut);G.dlp.connect(G.fb);G.fb.connect(G.dl);G.dOut.connect(G.mIn)}
 P.chans.forEach(ch=>{const s={};s.inp=ac.createGain();s.lp=bq('lowpass',20000);s.lp.Q.value=.6;s.sh=ac.createWaveShaper();s.duck=ac.createGain();s.vol=ac.createGain();s.pan=ac.createStereoPanner?ac.createStereoPanner():ac.createGain();s.sr=ac.createGain();s.sd=ac.createGain();
  s.inp.connect(s.lp);s.lp.connect(s.sh);s.sh.connect(s.duck);s.duck.connect(s.vol);s.vol.connect(s.pan);s.pan.connect(G.mIn);
  if(useRev){s.vol.connect(s.sr);s.sr.connect(G.rIn)}if(useDly){s.vol.connect(s.sd);s.sd.connect(G.dIn)}G.strips[ch.id]=s});
 applyMix(G,P,true);return G}
const tgt=(p,v,ac,now)=>now?(p.value=v):p.setTargetAtTime(v,ac.currentTime,.015);
function applyMix(G,P,now){const ac=G.ac,M=P.master,solo=P.chans.some(c=>c.solo);
 P.chans.forEach(ch=>{const s=G.strips[ch.id];if(!s)return;const on=!ch.mute&&(!solo||ch.solo),sc=INST[ch.inst]?(INST[ch.inst].sc||1):1;
  tgt(s.vol.gain,on?ch.vol/100*sc:0,ac,now);if(s.pan.pan)tgt(s.pan.pan,clamp(ch.pan/100,-1,1),ac,now);
  tgt(s.sr.gain,ch.rev/100,ac,now);tgt(s.sd.gain,ch.dly/100,ac,now);tgt(s.lp.frequency,200*Math.pow(100,ch.cut/100),ac,now);s.sh.curve=ch.drv>0?curve(ch.drv/100*8):null});
 tgt(G.bass.gain,M.bass,ac,now);tgt(G.air.gain,M.air,ac,now);tgt(G.lp.frequency,M.lofi?6500:20000,ac,now);
 const gl=M.glue;G.comp.threshold.value=gl?-17:0;G.comp.ratio.value=gl?2.6:1;G.comp.knee.value=gl?12:0;G.comp.attack.value=.02;G.comp.release.value=.2;
 tgt(G.vol.gain,M.vol/100,ac,now);tgt(G.rOut.gain,M.rev/100*.9,ac,now);tgt(G.dOut.gain,M.dly/100*.9,ac,now);
 if(G.dl){const beat=60/P.bpm,dt={'8':beat/2,'8d':beat*.75,'4':beat}[M.dtime]||beat*.75;G.dl.delayTime.value=dt}
 if(G.conv){const rk=M.room||'hall';if(G.room!==rk){G.room=rk;G.conv.buffer=makeIR(ac,ROOMS[rk].s,ROOMS[rk].d)}}}

/* ---------- turn a project into a time-ordered list of sound events ---------- */
const BUCKETS=[.15,.3,.6,1.2,2.4,4.8,9.6,19.2],bucketOf=d=>BUCKETS.find(b=>b>=d)||BUCKETS[BUCKETS.length-1];
function build(P,only){
 const sd=60/P.bpm/4,rng=mulberry(hstr(P.id)),hu=(P.human||0)/100,ev=[],by={},cnt={};P.chans.forEach(c=>by[c.id]=c);
 const clips=only?[{b:0,p:only.id}]:P.arr.clips,sw=step=>(step%2)?(P.swing/100)*sd*.66:0;let endStep=0;
 const addD=(t,cid,inst,v)=>{const vr=(inst==='hat'||inst==='shaker')?((cnt[inst]=(cnt[inst]||0)+1)%2):0;ev.push({t:Math.max(0,t),k:'d',ch:cid,inst,v,sk:'d|'+inst+'|'+vr})};
 const addN=(t,cid,inst,m,d,v)=>{const L=bucketOf(d);ev.push({t:Math.max(0,t),k:'n',ch:cid,inst,m,d,L,v,sk:'s|'+inst+'|'+m+'|'+L})};
 clips.forEach(cl=>{const pat=P.pats.find(x=>x.id===cl.p);if(!pat)return;const base=cl.b*16;endStep=Math.max(endStep,base+pat.bars*16);
  Object.entries(pat.d).forEach(([cid,arr])=>{const ch=by[cid];if(!ch)return;arr.forEach((v,s)=>{if(!v)return;const step=base+s;
   addD(step*sd+sw(step)+(rng()-.5)*.012*hu,cid,ch.inst,clamp((v===2?1:.7)*(1+(rng()-.5)*.35*hu),.1,1.1))})});
  Object.entries(pat.n).forEach(([cid,list])=>{const ch=by[cid];if(!ch)return;list.forEach(n=>{const step=base+n.s,m=INST[ch.inst].base+P.key+n.p;
   addN(step*sd+sw(step)+(rng()-.5)*.008*hu,cid,ch.inst,m,Math.max(.08,n.l*sd-.015),clamp((n.v||1)*(1+(rng()-.5)*.25*hu),.1,1.1))})});
  /* automatic drum fill at the end of every 8 bars */
  if(!only&&P.fills&&(cl.b+pat.bars)%8===0){const sn=P.chans.find(c=>c.inst==='snare');if(sn&&pat.d[sn.id]){const a=pat.d[sn.id],lb=(pat.bars-1)*16;
   if(![12,13,14,15].some(i=>a[lb+i]))for(let i=0;i<4;i++)addD((base+lb+12+i)*sd,sn.id,'snare',.35+i*.18)}}});
 /* sidechain "pump": duck pads / bass every kick */
 const kicks=ev.filter(e=>e.inst==='kick').map(e=>e.t).sort((a,b)=>a-b);
 P.chans.filter(c=>c.pump>0).forEach(c=>{kicks.forEach((tk,i)=>{const nx=kicks[i+1]===undefined?tk+1:kicks[i+1];ev.push({t:tk,k:'duck',ch:c.id,dur:Math.min(.24,Math.max(.05,nx-tk-.01)),depth:c.pump/100*.8})})});
 ev.sort((a,b)=>a.t-b.t);
 return{ev,total:endStep*sd,loop:only?only.bars*16*sd:0,sd}}
const kitOf=P=>KITS[P.kit]||KITS.Classic;

/* ---------- sample cache: each sound is rendered ONCE and re-used (this is what makes everything fast) ---------- */
const DLEN=K=>({kick:.5*K.kd+.1,snare:.3*K.sd+.12,clap:.28*K.sd+.12,hat:.12*K.sd+.04,ohat:.4*K.sd+.1,tom:.55,rim:.12,shaker:.14,conga:.38});
const ksig=K=>[K.kp,K.kd,K.sf,K.sd,K.hf].join(',');
const ckey=(sr,K,e)=>sr+'|'+(e.k==='d'?ksig(K):'')+'|'+e.sk;
const SC=new Map();
async function ensureSamples(sr,K,evs){
 const need=new Map();
 for(const e of evs){if(e.k==='duck')continue;const ck=ckey(sr,K,e);if(!SC.has(ck)&&!need.has(ck))need.set(ck,e)}
 if(!need.size)return;
 const dl=DLEN(K),items=[];let pos=0;
 need.forEach((e,ck)=>{const len=e.k==='d'?dl[e.inst]:e.L+.8;items.push({ck,e,len,at:pos});pos+=len+.25});
 const oc=new OfflineAudioContext(1,Math.ceil(pos*sr)+8,sr),G={nb:mkNoise(oc)},out=oc.createGain();out.connect(oc.destination);
 items.forEach(it=>{const e=it.e;try{if(e.k==='d')DR[e.inst](oc,G,out,it.at,1,K);else SY[e.inst](oc,G,out,it.at,mtof(e.m),e.L,1)}catch(x){}});
 const d=(await oc.startRendering()).getChannelData(0);
 items.forEach(it=>{const a=Math.round(it.at*sr);SC.set(it.ck,d.slice(a,a+Math.round(it.len*sr)))})}

/* real-time playback: one tiny buffer-source per hit (no heavy synthesis while playing) */
const ABW=new WeakMap();
function abuf(ac,ck){let m=ABW.get(ac);if(!m){m=new Map();ABW.set(ac,m)}let b=m.get(ck);if(!b){const d=SC.get(ck);if(!d)return null;b=ac.createBuffer(1,d.length,ac.sampleRate);b.copyToChannel(d,0);m.set(ck,b)}return b}
function fire(G,K,e,when){const s=G.strips[e.ch];if(!s)return;const ac=G.ac;
 try{if(e.k==='duck'){const g=s.duck.gain;g.setValueAtTime(1-e.depth,when);g.linearRampToValueAtTime(1,when+e.dur);return}
  const ab=abuf(ac,ckey(ac.sampleRate,K,e));if(!ab)return;const src=ac.createBufferSource();src.buffer=ab;const g=ac.createGain();g.gain.value=e.v;src.connect(g);g.connect(s.inp);src.start(when);
  if(e.k==='n'&&e.d+.06<ab.duration){g.gain.setValueAtTime(e.v,when+e.d);g.gain.linearRampToValueAtTime(0,when+e.d+.05);src.stop(when+e.d+.06)}}catch(x){}}

/* ---------- export: mix every channel in code, then run the effects once ---------- */
function mixStems(b,sr,K,w0,end,aud){
 const N=Math.ceil((end-w0)*sr),stems=new Map(),ev=b.ev,duck=new Map(),fade=Math.round(.05*sr);
 const stem=id=>{let s=stems.get(id);if(!s){s=new Float32Array(N);stems.set(id,s)}return s};
 let lo=0,hi=ev.length;const tmin=w0-22;while(lo<hi){const m=(lo+hi)>>1;if(ev[m].t<tmin)lo=m+1;else hi=m}
 for(let i=lo;i<ev.length;i++){const e=ev[i];if(e.t>=end)break;if(!aud.has(e.ch))continue;const s0=Math.round((e.t-w0)*sr);
  if(e.k==='duck'){const n=Math.round(e.dur*sr);if(s0+n<0)continue;let env=duck.get(e.ch);if(!env){env=new Float32Array(N).fill(1);duck.set(e.ch,env)}
   for(let j=Math.max(0,-s0);j<n;j++){const k=s0+j;if(k>=N)break;const v=1-e.depth*(1-j/n);if(v<env[k])env[k]=v}continue}
  const smp=SC.get(ckey(sr,K,e));if(!smp)continue;const gate=e.k==='n'?Math.round(e.d*sr):smp.length,to=e.k==='n'?Math.min(smp.length,gate+fade):smp.length;
  if(s0+to<=0)continue;const dst=stem(e.ch),g=e.v;
  for(let j=Math.max(0,-s0);j<to;j++){const k=s0+j;if(k>=N)break;dst[k]+=smp[j]*(j>gate?g*(1-(j-gate)/fade):g)}}
 duck.forEach((env,id)=>{const s=stems.get(id);if(s)for(let k=0;k<s.length;k++)s[k]*=env[k]});
 return stems}
async function renderSong(P,opt){
 opt=opt||{};const sr=opt.sr||32000,b=build(P),K=kitOf(P),tail=2.8,total=b.total+tail,CH=20,PRE=4,n=Math.max(1,Math.ceil(total/CH)),parts=[];let frames=0;
 await ensureSamples(sr,K,b.ev);opt.onProgress&&opt.onProgress(.05);
 const solo=P.chans.some(c=>c.solo),aud=new Set(P.chans.filter(c=>!c.mute&&(!solo||c.solo)).map(c=>c.id));
 for(let c=0;c<n;c++){const start=c*CH,end=Math.min(total,start+CH),w0=Math.max(0,start-PRE),len=end-w0;
  const stems=mixStems(b,sr,K,w0,end,aud),oc=new OfflineAudioContext(2,Math.ceil(len*sr),sr),G=mkGraph(oc,P,true);
  stems.forEach((st,id)=>{const s=G.strips[id];if(!s)return;const ab=oc.createBuffer(1,st.length,sr);ab.copyToChannel(st,0);const src=oc.createBufferSource();src.buffer=ab;src.connect(s.inp);src.start(0)});
  const buf=await oc.startRendering(),skip=Math.round((start-w0)*sr),cnt=Math.min(buf.length-skip,Math.round((end-start)*sr)),L=buf.getChannelData(0),R=buf.getChannelData(1),o=new Int16Array(cnt*2);
  for(let i=0;i<cnt;i++){const l=clamp(L[skip+i],-1,1),r=clamp(R[skip+i],-1,1);o[i*2]=l<0?l*32768:l*32767;o[i*2+1]=r<0?r*32768:r*32767}
  if(c===n-1){const f=Math.min(cnt,Math.round(2.5*sr));for(let i=0;i<f;i++){const g=1-i/f,k=(cnt-f+i)*2;o[k]*=g;o[k+1]*=g}}
  parts.push(o);frames+=cnt;opt.onProgress&&opt.onProgress(.05+.95*(c+1)/n);await new Promise(r=>setTimeout(r,0))}
 const h=new DataView(new ArrayBuffer(44)),w=(p,s)=>[...s].forEach((ch,i)=>h.setUint8(p+i,ch.charCodeAt(0)));
 w(0,'RIFF');h.setUint32(4,36+frames*4,true);w(8,'WAVEfmt ');h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,2,true);h.setUint32(24,sr,true);h.setUint32(28,sr*4,true);h.setUint16(32,4,true);h.setUint16(34,16,true);w(36,'data');h.setUint32(40,frames*4,true);
 return{blob:new Blob([h,...parts],{type:'audio/wav'}),seconds:frames/sr}}

/* ===================== project model + song templates ===================== */
const STEPS=16;
const arr0=n=>new Array(n).fill(0);
const CDEF={ /* default mixer settings per channel type */
 kick:{vol:100},snare:{vol:82,rev:12},clap:{vol:68,rev:18,pan:6},hat:{vol:50,pan:18},ohat:{vol:42,pan:-16,rev:8},tom:{vol:70},rim:{vol:55,pan:-20},shaker:{vol:48,pan:26},conga:{vol:58,pan:-26},
 sub:{vol:88,pump:55,drv:10},b808:{vol:86,pump:50,drv:22},logdrum:{vol:80,drv:20,pump:25},keys:{vol:62,pan:-12,rev:28,pump:22},pad:{vol:46,rev:45,pump:65,cut:85},
 lead:{vol:58,pan:10,rev:26,dly:22},pluck:{vol:58,pan:16,rev:20,dly:16},bell:{vol:50,pan:14,rev:35,dly:20}};
function newChan(id,inst,name){return Object.assign({id,inst,name:name||INST[inst].n,vol:80,pan:0,rev:0,dly:0,cut:100,drv:0,pump:0,mute:false,solo:false},CDEF[inst]||{})}
const BASIC=[['kick','kick'],['snare','snare'],['clap','clap'],['hat','hat'],['ohat','ohat'],['perc','shaker','Shaker'],['perc2','conga','Conga'],['bass','sub','Bass'],['keys','keys'],['pad','pad'],['lead','lead'],['pluck','pluck']];
function newProject(o){o=o||{};const P=Object.assign({id:uid('sp'),name:'My song',style:'custom',bpm:100,key:0,scale:'minor',kit:'Classic',swing:0,human:40,fills:true,
 master:{vol:85,rev:22,room:'hall',dly:12,dtime:'8d',glue:true,bass:0,air:1.5,lofi:false},chans:[],pats:[],arr:{tracks:4,len:32,clips:[],marks:[]},upd:Date.now()},o);
 if(!P.chans.length)P.chans=BASIC.map(([id,inst,n])=>newChan(id,inst,n));return P}
const newPat=(name,bars)=>({id:uid('pt'),name:name||'Pattern',bars:bars||2,d:{},n:{}});
const dArr=(pat,cid)=>{const L=pat.bars*STEPS,a=pat.d[cid]||(pat.d[cid]=arr0(L));while(a.length<L)a.push(0);return a};
const nList=(pat,cid)=>pat.n[cid]||(pat.n[cid]=[]);
function resizePat(pat,bars){pat.bars=bars;const L=bars*STEPS;Object.keys(pat.d).forEach(k=>{const a=pat.d[k];if(a.length>L)a.length=L;while(a.length<L)a.push(0)});
 Object.keys(pat.n).forEach(k=>{pat.n[k]=pat.n[k].filter(n=>n.s<L).map(n=>({...n,l:Math.min(n.l,L-n.s)}))})}
const patEnd=(P,cl)=>{const p=P.pats.find(x=>x.id===cl.p);return cl.b+(p?p.bars:1)};

/* scale helpers (stack thirds for chords) */
const scl=(P)=>SCL[P.scale]||SCL.minor;
function degSemi(scaleArr,i){const n=scaleArr.length;return scaleArr[((i%n)+n)%n]+12*Math.floor(i/n)}
const chordSemis=(sc,deg)=>[degSemi(sc,deg),degSemi(sc,deg+2),degSemi(sc,deg+4)];

/* ---------- song styles ---------- */
const S16=s=>[...(s||'').padEnd(16,'.')].slice(0,16).map(c=>c==='X'?2:c==='x'?1:0);
const STY={
 trap:{n:'Trap',e:'🔥',bpm:140,key:1,scale:'minor',kit:'Trap',sw:0,bi:'b808',pv:[0,5,2,6],ph:[0,3,5,6],comp:'stab',lead:'m1',
  v:{k:'x.....x...x.....',s:'........x.......',c:'........x.......',h:'x.x.x.x.x.x.x.x.'},h:{k:'x..x..x...x..x..',s:'........x.......',c:'........x.......',h:'xxxxxxxxxxxxxxxx',o:'..............x.'},bv:'x.....x...x.....',bh:'x..x..x...x..x..'},
 drill:{n:'Drill',e:'⚡',bpm:142,key:6,scale:'minor',kit:'Trap',sw:0,bi:'b808',pv:[0,5,3,6],ph:[0,6,5,3],comp:'stab',lead:'m2',
  v:{k:'x.....x...x.....',s:'........x.......',h:'x.x.x.xxx.x.x.xx',p2:'......x.......x.'},h:{k:'x.....x...x...x.',s:'........x.......',h:'x.x.x.xxx.x.x.xx',o:'..x.............',p2:'......x.......x.'},bv:'x.....x...x.....',bh:'x.....x...x...x.'},
 boombap:{n:'Boom bap',e:'🎤',bpm:90,key:9,scale:'minor',kit:'Boom bap',sw:28,bi:'sub',pv:[0,5,2,6],ph:[0,3,5,6],comp:'stab',lead:'m3',
  v:{k:'x.....x...x.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},h:{k:'x.....x..xx.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',o:'..............x.'},bv:'x.....x...x.....',bh:'x.....x..xx.....'},
 afro:{n:'Afrobeats',e:'🌍',bpm:105,key:7,scale:'minor',kit:'Afro',sw:12,bi:'sub',pv:[0,5,2,6],ph:[0,3,5,6],comp:'off',lead:'m3',pluck:true,
  v:{k:'x..x..x...x..x..',s:'....x.......x...',h:'x.xxx.xxx.xxx.xx',p:'xxxxxxxxxxxxxxxx',p2:'.x..x...x..x..x.'},h:{k:'x..x..x...x..x..',s:'....x.......x...',c:'....x.......x...',h:'x.xxx.xxx.xxx.xx',p:'xxxxxxxxxxxxxxxx',p2:'.x..x...x..x..x.'},bv:'x..x..x...x..x..',bh:'x..x..x...x.xx..'},
 piano:{n:'Amapiano',e:'🎹',bpm:112,key:6,scale:'minor',kit:'Afro',sw:0,bi:'sub',pv:[0,5,2,6],ph:[0,3,5,6],comp:'sus',lead:'m1',log:true,
  v:{k:'x...x...x...x...',c:'....x.......x...',h:'..x...x...x...x.',p:'x.xxx.xxx.xxx.xx'},h:{k:'x...x...x...x...',c:'....x.......x...',h:'..x...x...x...x.',o:'......x.......x.',p:'x.xxx.xxx.xxx.xx',p2:'.x..x...x..x..x.'},bv:'x.......x.......',bh:'x.......x.......',logv:'x..x..x..x..x..x.'.slice(0,16),logh:'x..x..x..x..x.x.'},
 highlife:{n:'Highlife',e:'🇬🇭',bpm:100,key:0,scale:'major',kit:'Afro',sw:10,bi:'sub',pv:[0,3,4,0],ph:[0,4,5,3],comp:'off',lead:'m2',pluck:true,
  v:{k:'x.....x.x.....x.',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',p:'x.xxx.xxx.xxx.xx',p2:'.x.x..x..x.x..x.'},h:{k:'x.....x.x.....x.',s:'....x.......x...',c:'....x.......x...',h:'x.x.x.x.x.x.x.x.',p:'x.xxx.xxx.xxx.xx',p2:'.x.x..x..x.x..x.'},bv:'x.....x.x.....x.',bh:'x..x..x.x..x..x.'},
 hiplife:{n:'Hiplife',e:'🎧',bpm:96,key:2,scale:'minor',kit:'Afro',sw:15,bi:'sub',pv:[0,5,3,6],ph:[0,3,5,6],comp:'stab',lead:'m3',
  v:{k:'x..x..x...x.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',p:'..x...x...x...x.',p2:'.x..x...x..x....'},h:{k:'x..x..x...x..x..',s:'....x.......x...',c:'....x.......x...',h:'x.x.x.x.x.x.x.x.',o:'..............x.',p:'..x...x...x...x.',p2:'.x..x...x..x..x.'},bv:'x..x..x...x.....',bh:'x..x..x...x..x..'},
 lofi:{n:'Lo-fi chill',e:'🌙',bpm:75,key:5,scale:'minor',kit:'Lo-fi',sw:35,bi:'sub',pv:[0,5,2,6],ph:[0,3,5,6],comp:'stab',lead:'m1',lofi:true,
  v:{k:'x.....x...x.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},h:{k:'x.....x...x...x.',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',o:'..............x.'},bv:'x.......x.......',bh:'x.....x.x.......'},
 pop:{n:'Pop',e:'⭐',bpm:118,key:0,scale:'major',kit:'Pop',sw:0,bi:'sub',pv:[0,4,5,3],ph:[0,5,3,4],comp:'stab',lead:'m2',
  v:{k:'x...x...x...x...',c:'....x.......x...',h:'..x...x...x...x.'},h:{k:'x...x...x...x...',s:'....x.......x...',c:'....x.......x...',h:'x.x.x.x.x.x.x.x.',o:'..x...x...x...x.'},bv:'x...x...x...x...',bh:'x.x.x.x.x.x.x.x.'},
 rnb:{n:'R&B slow jam',e:'💜',bpm:78,key:3,scale:'minor',kit:'Classic',sw:20,bi:'sub',pv:[0,5,3,6],ph:[0,3,5,6],comp:'sus',lead:'m1',
  v:{k:'x.....x.....x...',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},h:{k:'x.....x.....x...',s:'....x.......x...',c:'....x.......x...',h:'x.x.x.x.x.x.x.x.',o:'..............x.'},bv:'x.......x.......',bh:'x.....x.x.......'},
 gospel:{n:'Gospel',e:'🙏',bpm:80,key:7,scale:'major',kit:'Classic',sw:0,bi:'sub',pv:[0,3,4,0],ph:[0,4,5,3],comp:'sus',lead:'m2',
  v:{k:'x.......x.......',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},h:{k:'x...x...x...x...',s:'....x.......x...',c:'....x.......x...',h:'x.x.x.x.x.x.x.x.',o:'..............x.'},bv:'x.......x.......',bh:'x.....x.x.......'}};
const MOTIF={m1:[[0,4,2],[3,5,1],[4,4,2],[8,2,3],[16,4,2],[19,6,1],[20,5,2],[24,4,6]],
 m2:[[0,2,2],[2,4,2],[4,6,4],[10,5,2],[12,4,4],[16,2,2],[18,4,2],[20,5,4],[26,4,2],[28,2,4]],
 m3:[[0,4,1],[2,4,1],[4,5,2],[8,4,2],[12,2,3],[16,4,1],[18,4,1],[20,6,2],[24,5,2],[28,4,4]]};
const DKEY={k:'kick',s:'snare',c:'clap',h:'hat',o:'ohat',p:'perc',p2:'perc2'};

/* write one section's drums (4 bars) into a pattern; "keep" selects which drum rows to use */
function fillDrums(pat,sp,rows,vel){Object.entries(DKEY).forEach(([k,cid])=>{if(rows&&!rows.includes(k))return;const s=sp[k];if(!s)return;const a=dArr(pat,cid);
 for(let b=0;b<pat.bars;b++){const st=S16(s);for(let i=0;i<16;i++)a[b*16+i]=st[i]?Math.max(1,st[i]*(vel||1)>=1?st[i]:1):0}})}
function fillBass(P,pat,rhythm,prog,y,long){const sc=scl(P),cid='bass',L=nList(pat,cid);const hits=[...S16(rhythm)].map((v,i)=>v?i:-1).filter(i=>i>=0);
 for(let b=0;b<pat.bars;b++){const root=chordSemis(sc,prog[b%prog.length])[0];hits.forEach((s,j)=>{const nx=hits[j+1]===undefined?16:hits[j+1],last=j===hits.length-1;
  L.push({s:b*16+s,l:long?Math.min(nx-s,8):Math.max(1,Math.min(nx-s,4)),p:root+((last&&b%2)?7:0),v:1})})}}
function fillChords(P,pat,cid,prog,mode,vel,oct){const sc=scl(P),L=nList(pat,cid),v=vel||1;
 for(let b=0;b<pat.bars;b++){const ch=chordSemis(sc,prog[b%prog.length]);
  if(mode==='sus'){ch.forEach(p=>L.push({s:b*16,l:16,p:p+(oct||0),v}))}
  else if(mode==='stab'){[[0,3],[6,2],[10,3]].forEach(([s,l])=>ch.forEach(p=>L.push({s:b*16+s,l,p:p+(oct||0),v:s?v*.8:v})))}
  else if(mode==='off'){[2,6,10,14].forEach(s=>ch.forEach(p=>L.push({s:b*16+s,l:2,p:p+(oct||0),v:v*.85})))}
  else if(mode==='arp'){for(let i=0;i<8;i++){const t=[0,1,2,1][i%4];L.push({s:b*16+i*2,l:2,p:ch[t]+(oct||0),v:v*(i%2?.7:.95)})}}}}
function fillLead(P,pat,cid,key,oct){const sc=scl(P),L=nList(pat,cid),m=MOTIF[key]||MOTIF.m1;
 for(let r=0;r<pat.bars/2;r++)m.forEach(([s,d,l],i)=>{const last=i===m.length-1;L.push({s:r*32+s,l,p:degSemi(sc,d-(r%2&&last?1:0))+(oct||0),v:1})})}

function makeSong(id,minutes){
 const y=STY[id]||STY.trap,P=newProject({name:y.n+' song',style:id,bpm:y.bpm,key:y.key,scale:y.scale,kit:y.kit,swing:y.sw});
 P.chans.find(c=>c.id==='bass').inst=y.bi;Object.assign(P.chans.find(c=>c.id==='bass'),newChan('bass',y.bi,'Bass'));
 if(y.log)P.chans.splice(8,0,newChan('log','logdrum','Log drum'));
 if(y.lofi){P.master.lofi=true;P.master.rev=14}
 if(id==='piano'){P.master.glue=true}
 const mk=(code,name,bars)=>{const p=newPat(name,bars);p.id=code;P.pats.push(p);return p};
 const sc=scl(P);
 /* --- beat patterns --- */
 let p=mk('bi','Intro beat',4);fillDrums(p,y.v,['h','p'],.7);{const h=dArr(p,'hat');for(let i=0;i<32;i++)h[i]=0}
 p=mk('bv','Verse beat',4);fillDrums(p,y.v);fillBass(P,p,y.bv,y.pv,y,y.bi==='b808');if(y.log){const L=nList(p,'log');for(let b=0;b<4;b++){const r=chordSemis(sc,y.pv[b])[0];S16(y.logv||'x..x..x..x..x..x').forEach((v,i)=>v&&L.push({s:b*16+i,l:2,p:r,v:.9}))}}
 p=mk('bh','Hook beat',4);fillDrums(p,y.h);fillBass(P,p,y.bh,y.ph,y,y.bi==='b808');if(y.log){const L=nList(p,'log');for(let b=0;b<4;b++){const r=chordSemis(sc,y.ph[b])[0];S16(y.logh||'x..x..x..x..x.x.').forEach((v,i)=>v&&L.push({s:b*16+i,l:2,p:r+(i%5===3?7:0),v:1}))}}
 p=mk('bb','Bridge beat',4);{const k=dArr(p,'kick');for(let b=0;b<4;b++)[0,8].forEach(s=>k[b*16+s]=1);const h=dArr(p,'hat');for(let b=0;b<4;b++)[4,12].forEach(s=>h[b*16+s]=1);fillBass(P,p,'x.......',y.pv,y,true)}
 p=mk('bo','Outro beat',4);{const h=dArr(p,'hat');for(let i=0;i<32;i+=2)h[i]=1;const k=dArr(p,'kick');k[0]=1;k[16]=1}
 /* --- music patterns --- */
 const mus=(code,name,prog,compMode,withLead,vel)=>{const q=mk(code,name,4);fillChords(P,q,'pad',prog,'sus',.8);fillChords(P,q,'keys',prog,compMode,vel||1);if(withLead){fillLead(P,q,'lead',y.lead,0);if(y.pluck)fillChords(P,q,'pluck',prog,'arp',.8,12)}return q};
 mus('mi','Intro music',y.pv,'sus',false,.6);mus('mv','Verse music',y.pv,y.comp,false,.85);mus('mh','Hook music',y.ph,y.comp,true,1);mus('mb','Bridge music',y.pv,'sus',false,.8);mus('mo','Outro music',y.pv,'sus',false,.55);
 /* --- arrangement for the chosen length --- */
 const bar=240/y.bpm,T=Math.max(16,Math.round(minutes*60/bar)),plan=[['Intro',4,'i']];let n=4,k=0,pair=0;const cyc=[['Verse',8,'v'],['Hook',8,'h']];
 while(n+4<T){const s=cyc[k%2];plan.push([s[0],s[1],s[2]]);n+=s[1];k++;if(k%2===0){pair++;if(pair%2===0){plan.push(['Bridge',4,'b']);n+=4}}}
 plan.push(['Outro',4,'o']);
 let b=0;plan.forEach(([name,len,code])=>{P.arr.marks.push({b,name});for(let i=0;i<len;i+=4){P.arr.clips.push({t:0,b:b+i,p:'b'+code});P.arr.clips.push({t:1,b:b+i,p:'m'+code})}b+=len});
 P.arr.len=b;P.arr.tracks=4;P.upd=Date.now();return P}

/* quick style for the current pattern (used by the "Beat style" and "Surprise me" buttons) */
function styleToPattern(pat,id,variant,rand){const y=STY[id]||STY.boombap,sp=y[variant==='h'?'h':'v'];
 Object.values(DKEY).forEach(cid=>{if(pat.d[cid])pat.d[cid]=arr0(pat.bars*STEPS)});
 fillDrums(pat,sp);
 if(rand){Object.entries(DKEY).forEach(([k,cid])=>{const a=pat.d[cid];if(!a)return;for(let i=0;i<a.length;i++){if(k==='h'||k==='p'){if(Math.random()<.08)a[i]=a[i]?0:1}else if(k==='k'&&i%16!==0&&Math.random()<.07)a[i]=a[i]?0:1}})}}

/* ===================== state + real-time playback ===================== */
let PROJ=LS('studio',[]),P=null,pat=null,TAB='beat',selCh=null,barView=0,noteLen=2,chordMode=false,scaleLock=true,rollOct=0,paintPat=null,PM='pat',RES=null,rendering=false;
let saveT=null;
const saveAll=()=>{SV('studio',PROJ);window.dispatchEvent(new Event('lb-changed'))};
const touch=()=>{if(P)P.upd=Date.now();T.dirty=true;clearTimeout(saveT);saveT=setTimeout(saveAll,700)};
window.addEventListener('lb-sync',()=>{PROJ=LS('studio',[]);if(P){const n=PROJ.find(x=>x.id===P.id);if(n){P=n;pat=P.pats.find(x=>x.id===(pat&&pat.id))||P.pats[0]}else P=null}if(typeof PAGE!=='undefined'&&PAGE==='studio')render()});
const T={ac:null,G:null,on:false,mode:'pat',t0:0,ev:[],idx:0,loops:0,loopLen:0,total:0,sd:.15,timer:0,raf:0,dirty:false,sig:'',busy:false,lastStep:-1};
const sigOf=()=>P.id+'|'+P.chans.map(c=>c.id+c.inst).join(',');
async function ensureAC(){if(!T.ac)T.ac=new AC({latencyHint:'interactive'});if(T.ac.state==='suspended')await T.ac.resume();return T.ac}
function graph(){const ac=T.ac;if(!T.G||T.sig!==sigOf()){if(T.G){try{T.G.vol.disconnect()}catch(e){}}T.G=mkGraph(ac,P);T.sig=sigOf()}else applyMix(T.G,P,false);return T.G}
async function startPlay(mode,fromBar){if(T.loading)return;stopPlay(true);try{au.pause()}catch(e){}
 T.loading=true;const pb=$('#stPlay');if(pb)pb.textContent='⏳ Loading sounds…';
 try{const ac=await ensureAC();T.mode=mode;const b=mode==='pat'?build(P,pat):build(P),K=kitOf(P);
 const off0=mode==='song'?(fromBar||0)*16*b.sd:0;
 await ensureSamples(ac.sampleRate,K,mode==='song'?b.ev.filter(e=>e.t>=off0&&e.t<off0+6*16*b.sd):b.ev);if(T.on)return;
 T.ev=b.ev;T.total=b.total;T.loopLen=b.loop;T.sd=b.sd;graph();
 const off=mode==='song'?(fromBar||0)*16*b.sd:0;T.t0=ac.currentTime+.06-off;T.loops=0;T.idx=Math.max(0,T.ev.findIndex(e=>e.t>=off-1e-6));if(T.ev.length&&T.ev.findIndex(e=>e.t>=off-1e-6)<0)T.idx=T.ev.length;
 T.on=true;T.dirty=false;T.timer=setInterval(tick,25);anim();updPlay()}finally{T.loading=false;updPlay()}}
function stopPlay(quiet){if(T.timer)clearInterval(T.timer);T.timer=0;const was=T.on;T.on=false;cancelAnimationFrame(T.raf);
 if(T.G){const g=T.G;try{g.vol.gain.cancelScheduledValues(0);g.vol.gain.setTargetAtTime(0,T.ac.currentTime,.02)}catch(e){}setTimeout(()=>{try{g.vol.disconnect()}catch(e){}},150);if(T.G===g)T.G=null}
 mark(-1);if(!quiet)updPlay();return was}
function tick(){if(!T.on)return;const ac=T.ac,now=ac.currentTime,hz=now+.22,K=kitOf(P);
 if(T.dirty&&!T.busy){T.dirty=false;T.busy=true;const b=T.mode==='pat'?build(P,pat):build(P);
  ensureSamples(ac.sampleRate,K,b.ev).then(()=>{if(!T.on)return;const rel=now-(T.t0+T.loops*T.loopLen);T.ev=b.ev;T.loopLen=b.loop;T.total=b.total;T.sd=b.sd;let i=T.ev.findIndex(e=>e.t>=rel+.05);T.idx=i<0?T.ev.length:i;applyMix(T.G||graph(),P,false)}).finally(()=>T.busy=false)}
 if(T.mode==='song'&&!T.busy&&!T.prep&&T.idx<T.ev.length){const rel=now-T.t0,seg=T.ev.slice(T.idx,T.idx+400).filter(e=>e.t<rel+14);if(seg.length){T.prep=true;ensureSamples(ac.sampleRate,K,seg).finally(()=>T.prep=false)}}
 for(let g=0;g<3000;g++){
  if(T.idx>=T.ev.length){if(T.mode==='pat'&&T.loopLen>0){if(T.t0+(T.loops+1)*T.loopLen>hz)break;T.loops++;T.idx=0;continue}else{if(now>T.t0+T.total+2.6)stopPlay();break}}
  const e=T.ev[T.idx],when=T.t0+T.loops*T.loopLen+e.t;if(when>hz)break;if(when>=now-.03)fire(T.G,K,e,Math.max(when,now));T.idx++}}
function anim(){cancelAnimationFrame(T.raf);const f=()=>{if(!T.on)return;const t=T.ac.currentTime-T.t0-T.loops*T.loopLen;
  if(T.mode==='pat'){mark(Math.floor(((t%(T.loopLen||1))+(T.loopLen||1))%(T.loopLen||1)/T.sd))}
  else{const bar=Math.max(0,t/(T.sd*16));const pos=$('#stPos');if(pos)pos.textContent='Bar '+(Math.floor(bar)+1)+' · '+fmt(Math.max(0,t));const ph=$('#aHead');if(ph)ph.style.transform='translateX('+(bar*BW)+'px)'}
  T.raf=requestAnimationFrame(f)};f()}
function mark(s){if(T.lastStep===s)return;T.lastStep=s;document.querySelectorAll('#stTab .s-st.hl,#stTab .s-mc.hl').forEach(x=>x.classList.remove('hl'));
 if(s<0)return;document.querySelectorAll('#stTab [data-s="'+s+'"]').forEach(x=>x.classList.add('hl'));
 const ph=$('#aHead');if(ph&&TAB==='arr')ph.style.transform='translateX(0)';}
function updPlay(){const b=$('#stPlay');if(b){b.textContent=T.loading?'⏳ Loading sounds…':T.on?'⏹ Stop':'▶ Play';b.classList.toggle('red',T.on)}}
async function audition(cid,p){try{const ac=await ensureAC();graph();const ch=P.chans.find(c=>c.id===cid);if(!ch)return;const K=kitOf(P);let e;
  if(INST[ch.inst].k==='d')e={k:'d',ch:cid,inst:ch.inst,v:.9,sk:'d|'+ch.inst+'|0'};
  else{const m=INST[ch.inst].base+P.key+p;e={k:'n',ch:cid,inst:ch.inst,m,d:.4,L:.6,v:.9,sk:'s|'+ch.inst+'|'+m+'|.6'}}
  await ensureSamples(ac.sampleRate,K,[e]);fire(T.G,K,e,ac.currentTime+.01)}catch(x){}}

/* ===================== page skeleton + styles ===================== */
const BW=34;
const css=document.createElement('style');css.textContent=`
#studio .top h3{flex:1;margin-left:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
.s-btn{background:rgba(255,255,255,.09);border-radius:12px;padding:10px 14px;font-size:13px;font-weight:700;color:#fff}
.s-btn.pr{background:var(--ac);color:#04201c}.s-btn.red{background:#d9455a;color:#fff}.s-btn.on{background:#eee;color:#111}
.s-seg{display:flex;background:rgba(255,255,255,.08);border-radius:12px;overflow:hidden}.s-seg button{padding:10px 12px;font-size:12.5px;font-weight:700;color:#aaa}.s-seg button.on{background:#eee;color:#111}
.s-bpm{display:flex;align-items:center;gap:2px;background:rgba(255,255,255,.08);border-radius:12px}.s-bpm button{width:34px;height:38px;font-size:18px}.s-bpm b{min-width:34px;text-align:center;font-size:15px}.s-bpm small{color:var(--mut);font-size:10px;margin-right:8px}
.s-tabs{display:flex;gap:6px;margin:10px 0}.s-tab{flex:1;padding:10px 2px;border-radius:12px;background:rgba(255,255,255,.07);font-size:11.5px;font-weight:700;color:#aaa;text-align:center;line-height:1.25}.s-tab.on{background:#eee;color:#111}
.s-card{background:var(--card);border-radius:16px;padding:12px;margin:10px 0}.s-hint{color:var(--mut);font-size:12.5px;line-height:1.5;margin:6px 0}
.s-ch{margin:9px 0}.s-chh{display:flex;align-items:center;gap:6px;margin-bottom:4px}.s-chn{flex:1;text-align:left;font-size:12.5px;font-weight:700}
.s-ms{width:26px;height:24px;border-radius:7px;background:rgba(255,255,255,.08);font-size:11px;font-weight:800;color:#999}.s-ms.on{background:var(--ac);color:#04201c}
.s-grid{display:grid;grid-template-columns:repeat(16,1fr);gap:3px}
.s-st{height:34px;border-radius:6px;background:rgba(255,255,255,.07);padding:0;touch-action:manipulation}.s-st.q{background:rgba(255,255,255,.15)}.s-st.on{background:var(--ac)}.s-st.acc{background:#fff}.s-st.hl{box-shadow:inset 0 0 0 2px #fff}
.s-mc{height:22px;border-radius:5px;background:rgba(255,255,255,.07);display:grid;place-items:center}.s-mc.q{background:rgba(255,255,255,.13)}.s-mc i{width:8px;height:8px;border-radius:50%;background:var(--ac)}.s-mc.hl{box-shadow:inset 0 0 0 2px #fff}
.s-styles{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.s-style{background:rgba(255,255,255,.07);border-left:4px solid var(--ac);border-radius:12px;padding:12px;text-align:left;font-weight:700;font-size:14px}.s-style span{margin-right:6px}.s-style small{display:block;color:var(--mut);font-weight:400;font-size:11.5px;margin-top:2px}
.s-roll{overflow:auto;border-radius:12px;background:var(--card);max-height:430px;position:relative}
.s-rrow{display:flex}.s-rl{position:sticky;left:0;z-index:2;width:42px;flex:none;background:#1a1f26;font-size:10px;color:var(--mut);display:grid;place-items:center;border-bottom:1px solid #ffffff0a}.s-rl.root{color:#fff;font-weight:800}
.s-rc{width:26px;height:24px;flex:none;border-bottom:1px solid #ffffff0a;border-right:1px solid #ffffff0a;background:transparent;padding:0;touch-action:manipulation}.s-rc.q{border-right-color:#ffffff30}.s-rc.rt{background:rgba(255,255,255,.04)}.s-rc.on{background:var(--ac)}.s-rc.hold{background:color-mix(in srgb,var(--ac) 55%,#1a1f26)}.s-rc.hl{box-shadow:inset 0 0 0 2px #fff}
.s-rhead{position:sticky;top:0;z-index:3;background:#1a1f26}.s-rhead .s-rl{background:#1a1f26;height:20px}.s-rn{width:26px;height:20px;flex:none;font-size:9px;color:var(--mut);text-align:left;padding-left:2px}.s-rn.q{color:#fff;border-left:1px solid #ffffff30}
.s-arr{overflow-x:auto;background:var(--card);border-radius:12px;padding:6px 0 4px;position:relative}
.s-ainner{position:relative}.s-ruler{display:flex;height:22px}.s-rb{flex:none;width:${BW}px;font-size:9.5px;color:var(--mut);border-left:1px solid #ffffff18;padding-left:3px;line-height:22px;overflow:visible;white-space:nowrap}
.s-atrack{position:relative;height:46px;border-top:1px solid #ffffff10;background-image:repeating-linear-gradient(90deg,#ffffff0d 0,#ffffff0d 1px,transparent 1px,transparent ${BW}px)}
.s-clip{position:absolute;top:4px;height:38px;border-radius:8px;font-size:11px;font-weight:800;color:#04201c;padding:4px 6px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border:1px solid #0004}
.s-mark{position:absolute;top:0;height:22px;font-size:10px;font-weight:800;color:var(--ac);padding:0 4px;white-space:nowrap}
#aHead{position:absolute;top:0;bottom:0;left:0;width:2px;background:#fff;z-index:5;pointer-events:none}
.s-mx{background:var(--card);border-radius:14px;padding:10px;margin:8px 0}.s-mxh{display:flex;align-items:center;gap:6px}.s-mxh b{flex:1;font-size:13px}
.s-sl{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--mut);margin:7px 0}.s-sl span{width:62px}.s-sl input{flex:1}.s-sl b{width:34px;text-align:right;color:#fff;font-weight:600}
.s-sel{background:#1b1f27;color:#fff;border:1px solid #2a303b;border-radius:10px;padding:9px;font-size:13px;width:auto;margin:2px 4px 2px 0}
.s-prog{height:8px;background:#ffffff1f;border-radius:6px;overflow:hidden;margin:12px 0}.s-prog i{display:block;height:100%;width:0;background:var(--ac);transition:width .25s}
#stTour{position:fixed;inset:0;z-index:260;background:#0d0f12;display:none;flex-direction:column;align-items:center;padding:28px 24px calc(24px + env(safe-area-inset-bottom));text-align:center}#stTour.on{display:flex}
#stTour .tb{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;max-width:420px}#stTour .em{font-size:76px;margin:10px 0}#stTour h2{font-size:23px;margin:8px 0}#stTour p{color:#b8c0cc;line-height:1.6;font-size:15px}
.s-step{display:flex;gap:12px;align-items:flex-start;margin:10px 0;text-align:left}.s-step i{flex:none;width:26px;height:26px;border-radius:50%;background:var(--ac);color:#04201c;font-style:normal;font-weight:800;display:grid;place-items:center;font-size:13px}.s-step div{font-size:14px;line-height:1.5}
`;document.head.append(css);
document.body.insertAdjacentHTML('beforeend',`
<section id="create" class="page"><h1>Create</h1><p class="mut" style="margin:4px 0 14px">Make beats, build songs and record your voice.</p>
 <div id="crBody"></div></section>
<section id="studio" class="page"><div class="top"><button class="ic" id="stBack">‹</button><h3 id="stTitle">🎹 LB Studio</h3><button class="ic" id="stMore" style="display:none">⋮</button></div><div id="stBody"></div></section>
<div id="stTour"><div class="tb" id="tBody"></div><div class="dots" id="tDots"></div><div class="btnrow"><button class="bg2" id="tSkip">Skip</button><button class="bp" id="tNext">Next</button></div></div>`);

/* ===================== helpers ===================== */
const hueOf=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h};
const patCol=id=>`hsl(${hueOf(id)} 40% 66%)`;
const isD=c=>INST[c.inst].k==='d';
let startBar=0,lpT=0,lpF=false;
const root=()=>$('#studio');
const slider=(lab,attr,min,max,val,step)=>`<div class="s-sl"><span>${lab}</span><input type="range" min="${min}" max="${max}" step="${step||1}" value="${val}" ${attr}><b>${val}</b></div>`;
const seg=(items,cur,a)=>`<div class="s-seg">${items.map(([v,l])=>`<button class="${v==cur?'on':''}" data-a="${a}" data-v="${v}">${l}</button>`).join('')}</div>`;
const songEnd=()=>P.arr.clips.reduce((m,c)=>Math.max(m,patEnd(P,c)),0);
const songMin=()=>songEnd()*16*(60/P.bpm/4)/60;
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
const ask=(msg,def)=>{const r=prompt(msg,def||'');return r===null?null:r.trim()};

/* ===================== tutorials ===================== */
const TOUR=[
 ['🎹','Welcome to LB Studio','Make real songs like in FL Studio — one step at a time. You don’t need to know anything about music. This quick tour takes 30 seconds.'],
 ['⚡','Make a song in 1 tap','On the home screen pick a style (Afrobeats, Amapiano, Trap, Highlife…) and a length. LB Studio builds the full song: intro, verses, hooks, bridge and outro — with a different beat for each part.'],
 ['🥁','Beat tab = drums','Each row is an instrument. Tap the squares to put a sound on that beat. Hold a square a little longer for a louder “accent”. Press ▶ Play to hear it loop.'],
 ['🎹','Notes tab = melody','Tap on the grid to add a note. “Scale lock” keeps every note in tune. “Chord” adds 3 notes at once so it sounds full. Tap a note again to remove it.'],
 ['📋','Arrange tab = whole song','Pick a pattern, then tap the timeline to place it. Each row is a track. Put a different beat pattern in each section (verse, hook, bridge) so the beat changes — just like a real song.'],
 ['🎚','Mixer tab = make it sound pro','Volume, left/right, reverb and echo for every instrument. Try the presets: Clean, Warm, Radio, Lo-fi, Big hall, Wide. “Pump” makes pads breathe with the kick.'],
 ['⬆️','Export tab = save your song','Tap “Create my song”. It takes about 15 seconds for 4 minutes. Then add it to My music, download it or share it on WhatsApp. Enjoy! 🎉']];
let tIdx=0;
function tour(i){tIdx=i||0;const t=TOUR[tIdx];$('#stTour').classList.add('on');$('#tBody').innerHTML=`<div class="em">${t[0]}</div><h2>${t[1]}</h2><p>${t[2]}</p>`;
 $('#tDots').innerHTML=TOUR.map((_,k)=>`<i class="${k===tIdx?'on':''}"></i>`).join('');$('#tNext').textContent=tIdx===TOUR.length-1?'Start making music':'Next'}
function endTour(){$('#stTour').classList.remove('on');SV('st_tour',1)}
$('#tNext').onclick=()=>{if(tIdx>=TOUR.length-1)endTour();else tour(tIdx+1)};$('#tSkip').onclick=endTour;
const HELP={
 beat:['🥁 How to use the Beat tab',['Tap a square to add a drum hit. Tap again to remove it.','Hold a square to make it an accent (louder, white).','Press ▶ Play — the beat loops so you can edit while it plays.','Use 🎲 Surprise me for a new idea or 🎼 Beat style to load a ready-made groove.','Use “Edit notes” under a melody row to write notes for it.','Make several patterns (＋) — e.g. Verse beat, Hook beat — then place them in Arrange.']],
 notes:['🎹 How to use the Notes tab',['Choose an instrument at the top (bass, keys, pad, lead…).','Tap an empty square to add a note, tap a note to remove it. You hear it as you tap.','Higher rows = higher sound. ⬆/⬇ moves the keyboard range.','Keep “Scale lock” on so every note sounds right.','Turn on “Chord” to add 3 notes with one tap.','Note length: the bigger the number, the longer the note.']],
 arr:['📋 How to use Arrange',['Pick a pattern from the colored chips.','Tap the empty timeline to place it. Tap a placed block to remove, repeat or change it.','Each row is a track: use one row for beats and one for music.','To change the beat in a new section, place a different beat pattern there.','Tap a bar number to start playing from there. Use Song mode ▶ to hear everything.','“Make it longer” repeats your verses and hooks to reach 2–10 minutes.']],
 mix:['🎚 How to use the Mixer',['Volume sets how loud each instrument is. Pan moves it left or right.','Reverb = space (like a hall). Echo = repeats.','Pump makes pads and bass dip on every kick, like real club music.','At the bottom, Master controls the whole song. Try the presets.','You can change sliders while the song is playing.']],
 exp:['⬆️ How to export',['Choose Fast (small file) or High quality.','Tap “Create my song”. Keep the app open until it finishes.','Preview it, then tap “Add to My music” — it appears in your library.','Download or Share to send it on WhatsApp.']]};
function help(){const h=HELP[TAB];const n=document.createElement('div');n.style.padding='4px 16px 8px';n.innerHTML=h[1].map((s,i)=>`<div class="s-step"><i>${i+1}</i><div>${s}</div></div>`).join('')+'<button class="s-btn" id="hpT" style="margin-top:6px;width:100%">▶ Watch the full tour</button>';
 sheet(`<b>${h[0]}</b>`,[],n);n.querySelector('#hpT').onclick=()=>{closeSheet();tour(0)}}

/* ===================== home ===================== */
let lenSel=LS('st_len',4);
function home(){const b=$('#stBody');
 b.innerHTML=`<div class="s-card"><b style="font-size:16px">⚡ Make a full song in 1 tap</b><p class="s-hint">Pick the length, then a style. You get intro, verses, hooks, bridge and outro — and the beat changes in every section. You can edit everything afterwards.</p>
 <div class="mut" style="font-size:12px;margin:8px 0 4px">Song length</div><div class="chips">${[2,3,4,5,6,8].map(m=>`<button class="chip ${m==lenSel?'on':''}" data-a="len" data-v="${m}">${m} min</button>`).join('')}</div>
 <div class="s-styles">${Object.entries(STY).map(([id,y])=>`<button class="s-style" data-a="make" data-v="${id}"><span>${y.e}</span>${E(y.n)}<small>${y.bpm} BPM</small></button>`).join('')}</div></div>
 <div class="s-bar"><button class="s-btn" data-a="blank" style="flex:1">➕ Start from empty (like FL Studio)</button><button class="s-btn" data-a="tour">❓ How to use</button></div>
 <h3 style="margin:18px 0 6px">My projects</h3>${PROJ.length?PROJ.slice().sort((a,b)=>b.upd-a.upd).map(p=>`<div class="s-card" style="display:flex;align-items:center;gap:10px;margin:6px 0"><button data-a="open" data-v="${p.id}" style="flex:1;text-align:left"><b>${E(p.name)}</b><div class="mut" style="font-size:12px">${E((STY[p.style]||{}).n||'Custom')} · ${p.bpm} BPM · ${p.arr.clips.length?songMin().toFixed?'':'':''}${ago(p.upd)}</div></button><button class="ic" data-a="pmenu" data-v="${p.id}">⋮</button></div>`).join(''):'<p class="s-hint">No projects yet. Tap a style above to make your first song.</p>'}`}

function openProj(p){stopPlay(true);P=p;pat=P.pats[0];TAB='beat';barView=0;paintPat=pat&&pat.id;selCh=null;startBar=0;PM='pat';RES=null;render();window.scrollTo(0,0);if(!LS('st_tour',0))setTimeout(()=>tour(0),300)}
function newSong(id){const P2=makeSong(id,lenSel);PROJ.unshift(P2);saveAll();openProj(P2);TAB='arr';PM='song';render();toast('Song ready! Press ▶ Play to hear it 🎶')}
function blank(){const p=newProject({name:'New song',bpm:100});const q=newPat('Pattern 1',2);p.pats.push(q);p.arr.clips.push({t:0,b:0,p:q.id});p.arr.len=16;PROJ.unshift(p);saveAll();openProj(p)}

/* ===================== project shell ===================== */
function render(){const b=$('#stBody');if(!b)return;
 if(!P){$('#stTitle').textContent='🎹 LB Studio';$('#stMore').style.display='none';return home()}
 $('#stTitle').textContent=P.name;$('#stMore').style.display='';
 b.innerHTML=`<div class="s-bar"><button class="s-btn pr" id="stPlay" data-a="play">▶ Play</button>${seg([['pat','Pattern'],['song','Song']],PM,'pm')}
  <div class="s-bpm"><button data-a="bpm" data-v="-1">−</button><b id="bpmV" data-a="bpmT">${P.bpm}</b><button data-a="bpm" data-v="1">+</button><small>BPM</small></div><span class="mut" id="stPos" style="font-size:12px"></span></div>
  <div class="s-tabs">${[['beat','🥁','Beat'],['notes','🎹','Notes'],['arr','📋','Arrange'],['mix','🎚','Mixer'],['exp','⬆️','Export']].map(([k,i,l])=>`<button class="s-tab ${TAB===k?'on':''}" data-a="tab" data-v="${k}">${i}<br>${l}</button>`).join('')}</div>
  <div id="stTab"></div>`;tabRender();updPlay()}
function tabRender(){const el=$('#stTab');if(!el)return;const keep=[...el.querySelectorAll('.s-roll,.s-arr')].map(x=>[x.scrollLeft,x.scrollTop]);
 el.innerHTML=({beat:beatTab,notes:notesTab,arr:arrTab,mix:mixTab,exp:expTab}[TAB])()+`<div style="text-align:center;margin:14px 0"><button class="s-btn" data-a="help">❓ Help for this tab</button></div>`;
 el.querySelectorAll('.s-roll,.s-arr').forEach((x,i)=>{if(keep[i]){x.scrollLeft=keep[i][0];x.scrollTop=keep[i][1]}});T.lastStep=-2}

/* ===================== BEAT tab ===================== */
function patBar(){const L=pat.bars,bv=Math.min(barView,L-1);
 return `<div class="chips" style="flex-wrap:nowrap;overflow-x:auto">${P.pats.map(q=>`<button class="chip ${q.id===pat.id?'on':''}" data-a="pat" data-v="${q.id}" style="border-left:4px solid ${patCol(q.id)}">${E(q.name)}</button>`).join('')}<button class="chip" data-a="newpat">＋ New</button></div>
 <div class="s-bar"><span class="mut" style="font-size:12px">Length</span>${seg([[1,'1 bar'],[2,'2'],[4,'4'],[8,'8']],L,'bars')}<button class="s-btn" data-a="patmenu" style="margin-left:auto">⋮ Pattern</button></div>
 ${L>1?`<div class="chips">${Array.from({length:L},(_,i)=>`<button class="chip ${i===bv?'on':''}" data-a="bv" data-v="${i}">Bar ${i+1}</button>`).join('')}</div>`:''}`}
function beatTab(){const bv=Math.min(barView,pat.bars-1);
 let h=patBar()+'<div class="s-card" style="padding:6px 10px">';
 P.chans.forEach(c=>{h+=`<div class="s-ch"><div class="s-chh"><button class="s-chn" data-a="cmenu" data-v="${c.id}">${E(c.name)} <span class="mut" style="font-weight:400">⋮</span></button><button class="s-ms ${c.mute?'on':''}" data-a="mute" data-v="${c.id}">M</button><button class="s-ms ${c.solo?'on':''}" data-a="solo" data-v="${c.id}">S</button></div>`;
  if(isD(c)){const a=dArr(pat,c.id);h+=`<div class="s-grid">${Array.from({length:16},(_,i)=>{const v=a[bv*16+i];return `<button class="s-st ${i%4===0?'q':''} ${v?'on':''} ${v===2?'acc':''}" data-s="${i}" data-c="${c.id}" data-i="${bv*16+i}"></button>`}).join('')}</div>`}
  else{const L=nList(pat,c.id),on=new Set();L.forEach(n=>{for(let s=n.s;s<n.s+Math.max(1,n.l);s++)if(s>=bv*16&&s<bv*16+16)on.add(s-bv*16)});
   h+=`<div class="s-grid" style="opacity:.95">${Array.from({length:16},(_,i)=>`<div class="s-mc ${i%4===0?'q':''}" data-s="${i}">${on.has(i)?'<i></i>':''}</div>`).join('')}</div><button class="s-btn" data-a="edit" data-v="${c.id}" style="margin-top:5px;padding:7px 12px;font-size:12px">🎹 Edit notes (${L.length})</button>`}
  h+='</div>'});
 h+='</div><div class="s-bar"><button class="s-btn" data-a="rand">🎲 Surprise me</button><button class="s-btn" data-a="style">🎼 Beat style</button><button class="s-btn" data-a="addch">＋ Add instrument</button></div><p class="s-hint">Tip: tap a square to add a sound · hold it for an accent · ⋮ next to a name changes the sound.</p>';return h}
function stepSet(b,v){const a=dArr(pat,b.dataset.c);const i=+b.dataset.i;a[i]=v;b.classList.toggle('on',!!v);b.classList.toggle('acc',v===2);touch();if(v)audition(b.dataset.c,0)}
function styleSheet(){const n=document.createElement('div');let vr='v';n.style.padding='0 14px 8px';
 const draw=()=>{n.innerHTML=`<div class="s-hint">Replaces the drums in this pattern.</div>${seg([['v','Verse feel'],['h','Hook feel (busier)']],vr,'x')}<div class="s-styles">${Object.entries(STY).map(([id,y])=>`<button class="s-style" data-st="${id}">${y.e} ${E(y.n)}</button>`).join('')}</div>`;
  n.querySelectorAll('[data-a=x]').forEach(b=>b.onclick=()=>{vr=b.dataset.v;draw()});
  n.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{styleToPattern(pat,b.dataset.st,vr);touch();closeSheet();tabRender();toast(STY[b.dataset.st].n+' beat loaded')})};draw();sheet('<b>🎼 Beat style</b>',[],n)}
function chMenu(cid){const c=P.chans.find(x=>x.id===cid);if(!c)return;const same=Object.keys(INST).filter(k=>INST[k].k===INST[c.inst].k&&k!==c.inst);
 sheet(`<b>${E(c.name)}</b>`,[{ic:'✏️',t:'Rename',fn:()=>{const r=ask('Name',c.name);if(r){c.name=r;touch();tabRender()}}},{ic:'🔁',t:'Change sound…',fn:()=>setTimeout(()=>sheet('<b>Choose a sound</b>',same.map(k=>({ic:INST[k].k==='d'?'🥁':'🎹',t:INST[k].n,fn:()=>{c.inst=k;c.name=INST[k].n;touch();tabRender();audition(c.id,0)}}))),50)},
  {ic:'🧹',t:'Clear in this pattern',fn:()=>{if(isD(c))pat.d[c.id]=new Array(pat.bars*16).fill(0);else pat.n[c.id]=[];touch();tabRender()}},
  {ic:'🗑',t:'Remove instrument',fn:()=>{if(P.chans.length<2)return toast('Keep at least one instrument');P.chans=P.chans.filter(x=>x.id!==cid);P.pats.forEach(q=>{delete q.d[cid];delete q.n[cid]});P.arr.clips=P.arr.clips;touch();tabRender()}}])}
function addChSheet(){sheet('<b>Add an instrument</b>',Object.keys(INST).map(k=>({ic:INST[k].k==='d'?'🥁':'🎹',t:INST[k].n,fn:()=>{const c=newChan(uid('c'),k);P.chans.push(c);touch();T.sig='';tabRender();audition(c.id,0)}})))}
function patMenu(){sheet(`<b>${E(pat.name)}</b>`,[{ic:'✏️',t:'Rename',fn:()=>{const r=ask('Pattern name',pat.name);if(r){pat.name=r;touch();tabRender()}}},
 {ic:'📄',t:'Duplicate',fn:()=>{const q=JSON.parse(JSON.stringify(pat));q.id=uid('pt');q.name=pat.name+' copy';P.pats.push(q);pat=q;paintPat=q.id;touch();tabRender()}},
 {ic:'🧹',t:'Clear everything',fn:()=>{pat.d={};pat.n={};touch();tabRender()}},
 {ic:'🗑',t:'Delete pattern',fn:()=>{if(P.pats.length<2)return toast('Keep at least one pattern');P.pats=P.pats.filter(x=>x!==pat);P.arr.clips=P.arr.clips.filter(c=>c.p!==pat.id);pat=P.pats[0];paintPat=pat.id;touch();tabRender()}}])}

/* ===================== NOTES tab ===================== */
function rollRows(){const sc=scl(P);let r=[];if(scaleLock){for(let o=1;o>=0;o--)for(let i=sc.length-1;i>=0;i--)r.push(sc[i]+12*(o+rollOct))}else for(let i=23;i>=0;i--)r.push(i+12*rollOct);return r}
const nName=(c,p)=>{const m=INST[c.inst].base+P.key+p;return NN[((m%12)+12)%12]+(Math.floor(m/12)-1)};
function notesTab(){const syn=P.chans.filter(c=>!isD(c));if(!selCh||!syn.some(c=>c.id===selCh)){selCh=syn[0]&&syn[0].id;const L0=selCh&&nList(pat,selCh);if(L0&&L0.length)rollOct=Math.floor(Math.min(...L0.map(n=>n.p))/12)}
 if(!selCh)return '<p class="s-hint">Add a melody instrument first (Beat tab → ＋ Add instrument).</p>';
 const c=P.chans.find(x=>x.id===selCh),L=nList(pat,selCh),rows=rollRows(),cols=pat.bars*16,st=new Map(),hold=new Set();
 L.forEach(n=>{st.set(n.p+'|'+n.s,n);for(let s=n.s+1;s<n.s+n.l;s++)hold.add(n.p+'|'+s)});
 let h=patBar()+`<div class="chips" style="flex-wrap:nowrap;overflow-x:auto">${syn.map(x=>`<button class="chip ${x.id===selCh?'on':''}" data-a="selch" data-v="${x.id}">${E(x.name)}</button>`).join('')}</div>
 <div class="s-bar"><button class="s-btn ${scaleLock?'on':''}" data-a="slock">🔒 Scale lock</button><button class="s-btn ${chordMode?'on':''}" data-a="chord">🎵 Chord</button><button class="s-btn" data-a="oct" data-v="1">⬆</button><button class="s-btn" data-a="oct" data-v="-1">⬇</button><select class="s-sel" data-a="scale">${Object.entries(SCN).map(([k,v])=>`<option value="${k}" ${P.scale===k?'selected':''}>${v}</option>`).join('')}</select></div>
 <div class="s-bar"><span class="mut" style="font-size:12px">Note length</span>${seg([[1,'1'],[2,'2'],[4,'4'],[8,'8'],[16,'16']],noteLen,'nlen')}</div>
 <div class="s-roll"><div style="width:${42+cols*26}px"><div class="s-rhead s-rrow"><div class="s-rl"></div>${Array.from({length:cols},(_,i)=>`<div class="s-rn ${i%4===0?'q':''}" ${i%4===0?'':''}>${i%4===0?(i/16|0)+1+'.'+(i%16/4+1):''}</div>`).join('')}</div>`;
 rows.forEach(p=>{h+=`<div class="s-rrow"><div class="s-rl ${((p%12)+12)%12===0?'root':''}">${nName(c,p)}</div>`;for(let s=0;s<cols;s++){const k=p+'|'+s;h+=`<button class="s-rc ${s%4===0?'q':''} ${(s>>2)%2?'rt':''} ${st.has(k)?'on':hold.has(k)?'hold':''}" data-s="${s%16}" data-p="${p}" data-i="${s}"></button>`}h+='</div>'});
 return h+'</div></div><p class="s-hint">Tap to add a note · tap a note to remove it · ⬆⬇ changes the pitch range.</p>'}
function rollTap(b){const p=+b.dataset.p,s=+b.dataset.i,c=P.chans.find(x=>x.id===selCh),L=nList(pat,selCh);
 const ex=L.findIndex(n=>n.p===p&&s>=n.s&&s<n.s+n.l);if(ex>=0){L.splice(ex,1);touch();return tabRender()}
 let ps=[p];if(chordMode){const sc=scl(P),n=sc.length;if(scaleLock){const o=Math.floor(p/12),i=sc.indexOf(((p%12)+12)%12);if(i>=0)ps=chordSemis(sc,i+n*o)}else ps=[p,p+(['minor','dorian','blues','pent'].includes(P.scale)?3:4),p+7]}
 ps.forEach(q=>{L.push({s,l:Math.min(noteLen,pat.bars*16-s),p:q,v:1});audition(selCh,q)});touch();tabRender()}

/* ===================== ARRANGE tab ===================== */
function arrTab(){const N=Math.max(P.arr.len,songEnd())+4,W=N*BW,pats=P.pats;
 let h=`<div class="s-card" style="margin-top:0"><div class="mut" style="font-size:12px;margin-bottom:6px">1. Pick a pattern → 2. tap the timeline to place it</div><div class="chips" style="flex-wrap:wrap">${pats.map(q=>`<button class="chip ${paintPat===q.id?'on':''}" data-a="paint" data-v="${q.id}" style="border-left:4px solid ${patCol(q.id)}">${E(q.name)} <small>${q.bars}b</small></button>`).join('')}</div></div>
 <div class="s-arr" id="sArr"><div class="s-ainner" style="width:${W}px"><div id="aHead" style="height:100%"></div>
 <div style="position:relative;height:18px">${P.arr.marks.map((m,i)=>`<div class="s-mark" data-a="mark" data-v="${i}" style="left:${m.b*BW}px">▸ ${E(m.name)}</div>`).join('')}</div>
 <div class="s-ruler">${Array.from({length:N},(_,i)=>`<div class="s-rb" data-a="rbar" data-v="${i}" style="${i===startBar?'color:#fff;font-weight:800':''}">${i+1}</div>`).join('')}</div>`;
 for(let t=0;t<P.arr.tracks;t++){h+=`<div class="s-atrack" data-t="${t}"><span class="mut" style="position:absolute;left:2px;top:0;font-size:9px;pointer-events:none">Track ${t+1}</span>${P.arr.clips.map((c,ci)=>c.t!==t?'':`<div class="s-clip" data-ci="${ci}" style="left:${c.b*BW}px;width:${Math.max(1,(patEnd(P,c)-c.b))*BW-2}px;top:11px;height:33px;background:${patCol(c.p)}">${E((pats.find(x=>x.id===c.p)||{}).name||'?')}</div>`).join('')}</div>`}
 h+=`</div></div><div class="s-bar"><button class="s-btn" data-a="atrk" data-v="1">＋ Track</button><button class="s-btn" data-a="atrk" data-v="-1">− Track</button><button class="s-btn" data-a="amark">🏷 Label</button><button class="s-btn pr" data-a="longer">⏱ Make it longer</button></div>
 <p class="s-hint">Song: <b>${songEnd()}</b> bars ≈ <b>${songMin().toFixed(1)}</b> min · starts from bar <b>${startBar+1}</b> (tap a bar number to change) · place a different beat pattern in a section to change the beat there.</p>`;return h}
function place(t,b,pid){const q=P.pats.find(x=>x.id===pid);if(!q)return;const e=b+q.bars;P.arr.clips=P.arr.clips.filter(c=>!(c.t===t&&c.b<e&&patEnd(P,c)>b));P.arr.clips.push({t,b,p:pid})}
function clipMenu(ci){const c=P.arr.clips[ci];if(!c)return;const q=P.pats.find(x=>x.id===c.p);
 const rep=n=>()=>{for(let k=1;k<n;k++)place(c.t,c.b+k*q.bars,c.p);touch();tabRender()};
 sheet(`<b>${E(q?q.name:'Block')} · bar ${c.b+1}</b>`,[{ic:'▶',t:'Play from here',fn:()=>{startBar=c.b;PM='song';render();startPlay('song',startBar)}},{ic:'✏️',t:'Edit this pattern',fn:()=>{if(q){pat=q;barView=0;TAB='beat';render()}}},
  {ic:'2️⃣',t:'Repeat ×2',fn:rep(2)},{ic:'4️⃣',t:'Repeat ×4',fn:rep(4)},{ic:'8️⃣',t:'Repeat ×8',fn:rep(8)},
  {ic:'🔁',t:'Change pattern…',fn:()=>setTimeout(()=>sheet('<b>Use pattern</b>',P.pats.map(x=>({ic:'🧩',t:x.name,fn:()=>{c.p=x.id;touch();tabRender()}}))),50)},
  {ic:'🗑',t:'Remove',fn:()=>{P.arr.clips.splice(ci,1);touch();tabRender()}}])}
function markMenu(i){const m=P.arr.marks[i];sheet(`<b>${E(m.name)}</b>`,[{ic:'✏️',t:'Rename',fn:()=>{const r=ask('Section name',m.name);if(r){m.name=r;touch();tabRender()}}},{ic:'🗑',t:'Remove label',fn:()=>{P.arr.marks.splice(i,1);touch();tabRender()}}])}
function longerSheet(){sheet('<b>Make the song longer</b>',[2,3,4,5,6,8,10].map(m=>({ic:'⏱',t:m+' minutes',fn:()=>extendTo(m)})))}
function extendTo(min){const bar=240/P.bpm,target=Math.round(min*60/bar),end=songEnd();if(target<=end+2)return toast('Your song is already about '+songMin().toFixed(1)+' min. Pick a longer time.');
 const mk=P.arr.marks.slice().sort((a,b)=>a.b-b.b),outro=mk.length>1&&/outro/i.test(mk[mk.length-1].name)?mk[mk.length-1].b:end,bs=mk.length>2?mk[1].b:0,be=Math.max(outro,bs+4),len=be-bs;if(len<4)return toast('Add a few bars of verse/hook first');
 const n=Math.max(1,Math.round((target-end)/len)),tail=P.arr.clips.filter(c=>c.b>=be),body=P.arr.clips.filter(c=>c.b>=bs&&c.b<be),mBody=P.arr.marks.filter(m=>m.b>=bs&&m.b<be);
 tail.forEach(c=>c.b+=n*len);P.arr.marks.forEach(m=>{if(m.b>=be)m.b+=n*len});
 for(let k=0;k<n;k++){body.forEach(c=>P.arr.clips.push({...c,b:c.b+(k)*len+len}));mBody.forEach(m=>P.arr.marks.push({...m,b:m.b+k*len+len}))}
 P.arr.len=songEnd();touch();tabRender();toast('Now '+songMin().toFixed(1)+' min ✓')}

/* ===================== MIXER tab ===================== */
const PRESETS={Clean:{rev:14,room:'plate',dly:8,glue:true,bass:0,air:2,lofi:false},Warm:{rev:20,room:'room',dly:10,glue:true,bass:3,air:-1,lofi:false},Radio:{rev:12,room:'plate',dly:8,glue:true,bass:2,air:4,lofi:false},'Lo-fi':{rev:14,room:'room',dly:12,glue:true,bass:2,air:-2,lofi:true},'Big hall':{rev:40,room:'big',dly:14,glue:true,bass:1,air:2,lofi:false},Wide:{rev:30,room:'hall',dly:22,glue:true,bass:1,air:3,lofi:false}};
function mixTab(){const M=P.master;
 let h=`<div class="s-card"><b>🎛 Master — whole song</b><div class="chips" style="margin:8px 0">${Object.keys(PRESETS).map(k=>`<button class="chip" data-a="preset" data-v="${k}">${k}</button>`).join('')}</div>
 ${slider('Loudness','data-mm="vol"',30,100,M.vol)}${slider('Reverb','data-mm="rev"',0,70,M.rev)}${slider('Echo','data-mm="dly"',0,60,M.dly)}${slider('Bass boost','data-mm="bass"',-6,9,M.bass,.5)}${slider('Shine','data-mm="air"',-4,8,M.air,.5)}
 <div class="s-bar"><select class="s-sel" data-mm="room">${Object.entries(ROOMS).map(([k,v])=>`<option value="${k}" ${M.room===k?'selected':''}>Room: ${v.n}</option>`).join('')}</select><select class="s-sel" data-mm="dtime">${[['8','Echo: 1/8'],['8d','Echo: dotted'],['4','Echo: 1/4']].map(([k,l])=>`<option value="${k}" ${M.dtime===k?'selected':''}>${l}</option>`).join('')}</select>
 <button class="s-btn ${M.glue?'on':''}" data-a="mt" data-v="glue">Glue</button><button class="s-btn ${M.lofi?'on':''}" data-a="mt" data-v="lofi">Lo-fi</button></div>
 <div class="s-sl"><span>Swing</span><input type="range" min="0" max="60" value="${P.swing}" data-pp="swing"><b>${P.swing}</b></div><div class="s-sl"><span>Human feel</span><input type="range" min="0" max="100" value="${P.human}" data-pp="human"><b>${P.human}</b></div></div>`;
 P.chans.forEach(c=>{h+=`<div class="s-mx"><div class="s-mxh"><b>${E(c.name)}</b><button class="s-ms ${c.mute?'on':''}" data-a="mute" data-v="${c.id}">M</button><button class="s-ms ${c.solo?'on':''}" data-a="solo" data-v="${c.id}">S</button></div>
  ${slider('Volume',`data-m="vol" data-c="${c.id}"`,0,100,c.vol)}${slider('Pan L↔R',`data-m="pan" data-c="${c.id}"`,-100,100,c.pan)}
  <details><summary class="mut" style="font-size:12px;padding:4px 0">More (reverb, echo, tone, drive${isD(c)?'':', pump'})</summary>${slider('Reverb',`data-m="rev" data-c="${c.id}"`,0,100,c.rev)}${slider('Echo',`data-m="dly" data-c="${c.id}"`,0,100,c.dly)}${slider('Tone',`data-m="cut" data-c="${c.id}"`,0,100,c.cut)}${slider('Drive',`data-m="drv" data-c="${c.id}"`,0,100,c.drv)}${isD(c)?'':slider('Pump',`data-m="pump" data-c="${c.id}"`,0,100,c.pump)}</details></div>`});
 return h}

/* ===================== EXPORT tab ===================== */
let expSr=LS('st_sr',32000);
function expTab(){const mins=songMin();
 let h=`<div class="s-card"><label class="mut" style="font-size:12px">Song name</label><input id="stName" value="${E(P.name)}" style="width:100%;margin:4px 0 10px;padding:12px;border-radius:12px;background:#1b1f27;color:#fff;border:1px solid #2a303b">
 <div class="mut" style="font-size:12px;margin-bottom:4px">Quality</div>${seg([[32000,'⚡ Fast'],[44100,'💎 High']],expSr,'sr')}
 <p class="s-hint">Length: <b>${mins.toFixed(1)} min</b> (${songEnd()} bars). ${songEnd()?'':'<b>Your arrangement is empty — go to Arrange and place patterns first.</b>'}</p>
 <div class="s-prog" style="display:${rendering?'block':'none'}"><i id="stProg"></i></div><button class="s-btn pr" data-a="render" style="width:100%" ${rendering||!songEnd()?'disabled':''}>${rendering?'Creating… keep the app open':'🎬 Create my song'}</button></div>`;
 if(RES)h+=`<div class="s-card"><b>✅ ${E(RES.name)}</b><div class="mut" style="font-size:12px;margin:2px 0 8px">${fmt(RES.seconds)} · ${(RES.blob.size/1048576).toFixed(1)} MB</div><audio id="stAud" controls src="${RES.url}" style="width:100%"></audio>
  <div class="s-bar"><button class="s-btn pr" data-a="resAdd">➕ Add to My music</button><button class="s-btn" data-a="resDl">⬇ Download</button><button class="s-btn" data-a="resSh">📤 Share</button></div></div>`;
 return h}
async function doRender(){if(rendering)return;stopPlay(true);rendering=true;if(RES){URL.revokeObjectURL(RES.url);RES=null}P.name=($('#stName')&&$('#stName').value.trim())||P.name;touch();tabRender();
 try{const r=await renderSong(P,{sr:expSr,onProgress:f=>{const i=$('#stProg');if(i)i.style.width=Math.round(f*100)+'%'}});RES={blob:r.blob,seconds:r.seconds,name:P.name,url:URL.createObjectURL(r.blob)}}catch(e){toast('Could not create the song: '+(e.message||e))}
 rendering=false;if(TAB==='exp')tabRender()}
const resFile=()=>new File([RES.blob],'LB Studio - '+RES.name.replace(/[\\/:*?"<>|]/g,'')+'.wav',{type:'audio/wav'});

/* ===================== events ===================== */
const sr_=root();
sr_.addEventListener('pointerdown',e=>{const b=e.target.closest('.s-st');if(!b)return;lpF=false;clearTimeout(lpT);lpT=setTimeout(()=>{lpF=true;stepSet(b,2);navigator.vibrate&&navigator.vibrate(15)},420)});
['pointerup','pointercancel','pointerleave','pointermove'].forEach(ev=>sr_.addEventListener(ev,()=>clearTimeout(lpT)));
sr_.addEventListener('contextmenu',e=>{if(e.target.closest('.s-st'))e.preventDefault()});
function restart(){const was=T.on,m=PM;if(was){stopPlay(true);startPlay(m,startBar)}}
sr_.addEventListener('click',e=>{
 const st=e.target.closest('.s-st');if(st){if(lpF){lpF=false;return}const a=dArr(pat,st.dataset.c),i=+st.dataset.i;stepSet(st,a[i]?0:1);return}
 const rc=e.target.closest('.s-rc');if(rc)return rollTap(rc);
 const cl=e.target.closest('.s-clip');if(cl)return clipMenu(+cl.dataset.ci);
 const mk=e.target.closest('.s-mark');if(mk)return markMenu(+mk.dataset.v);
 const tr=e.target.closest('.s-atrack');if(tr&&!e.target.closest('[data-a]')){if(!paintPat)return toast('Pick a pattern first');const b=Math.floor((e.clientX-tr.getBoundingClientRect().left)/BW);place(+tr.dataset.t,Math.max(0,b),paintPat);P.arr.len=Math.max(P.arr.len,songEnd());touch();return tabRender()}
 const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a,v=el.dataset.v;
 switch(a){
  case 'len':lenSel=+v;SV('st_len',lenSel);home();break;
  case 'make':newSong(v);break;case 'blank':blank();break;case 'tour':tour(0);break;
  case 'open':openProj(PROJ.find(x=>x.id===v));break;
  case 'pmenu':{const p=PROJ.find(x=>x.id===v);sheet(`<b>${E(p.name)}</b>`,[{ic:'✏️',t:'Rename',fn:()=>{const r=ask('Name',p.name);if(r){p.name=r;p.upd=Date.now();saveAll();home()}}},{ic:'📄',t:'Duplicate',fn:()=>{const q=JSON.parse(JSON.stringify(p));q.id=uid('sp');q.name+=' copy';q.upd=Date.now();PROJ.unshift(q);saveAll();home()}},{ic:'🗑',t:'Delete',fn:()=>{if(!confirm('Delete “'+p.name+'”?'))return;PROJ=PROJ.filter(x=>x!==p);const d=LS('studio_del',{});d[p.id]=Date.now();SV('studio_del',d);saveAll();home()}}]);break}
  case 'play':if(T.on)stopPlay();else startPlay(PM,startBar);break;
  case 'pm':PM=v;{const was=T.on;if(was)stopPlay(true);render();if(was)startPlay(PM,startBar)}break;
  case 'bpm':P.bpm=clamp(P.bpm+ +v,50,220);$('#bpmV').textContent=P.bpm;touch();restart();break;
  case 'bpmT':{const r=ask('BPM (50–220)',P.bpm);if(r&&+r){P.bpm=clamp(Math.round(+r),50,220);$('#bpmV').textContent=P.bpm;touch();restart()}break}
  case 'tab':TAB=v;render();break;case 'help':help();break;
  case 'pat':pat=P.pats.find(x=>x.id===v);barView=0;paintPat=pat.id;if(T.on&&PM==='pat'){T.dirty=true}tabRender();break;
  case 'newpat':{const q=newPat('Pattern '+(P.pats.length+1),pat.bars);P.pats.push(q);pat=q;paintPat=q.id;touch();tabRender();break}
  case 'bars':resizePat(pat,+v);barView=0;touch();tabRender();break;
  case 'bv':barView=+v;tabRender();break;
  case 'patmenu':patMenu();break;case 'cmenu':chMenu(v);break;
  case 'mute':case 'solo':{const c=P.chans.find(x=>x.id===v);c[a==='mute'?'mute':'solo']=!c[a==='mute'?'mute':'solo'];touch();T.G&&applyMix(T.G,P,false);tabRender();break}
  case 'edit':selCh=v;{const L=nList(pat,v);rollOct=L.length?Math.floor(Math.min(...L.map(n=>n.p))/12):0}TAB='notes';render();break;
  case 'rand':{const k=Object.keys(STY),id=k[Math.floor(Math.random()*k.length)];styleToPattern(pat,id,'v',true);touch();tabRender();toast('🎲 '+STY[id].n+' groove + a twist');break}
  case 'style':styleSheet();break;case 'addch':addChSheet();break;
  case 'selch':selCh=v;{const L=nList(pat,v);rollOct=L.length?Math.floor(Math.min(...L.map(n=>n.p))/12):0}tabRender();break;
  case 'slock':scaleLock=!scaleLock;tabRender();break;case 'chord':chordMode=!chordMode;tabRender();break;
  case 'oct':rollOct=clamp(rollOct+ +v,-3,3);tabRender();break;case 'nlen':noteLen=+v;tabRender();break;
  case 'paint':paintPat=v;tabRender();break;
  case 'rbar':startBar=+v;tabRender();if(T.on&&PM==='song'){stopPlay(true);startPlay('song',startBar)}break;
  case 'atrk':P.arr.tracks=clamp(P.arr.tracks+ +v,1,8);touch();tabRender();break;
  case 'amark':{const r=ask('Section name (e.g. Verse, Hook, Bridge)','Verse');if(r){P.arr.marks=P.arr.marks.filter(m=>m.b!==startBar);P.arr.marks.push({b:startBar,name:r});touch();tabRender()}break}
  case 'longer':longerSheet();break;
  case 'preset':Object.assign(P.master,PRESETS[v]);touch();T.G&&applyMix(T.G,P,false);tabRender();toast(v+' sound applied');break;
  case 'mt':P.master[v]=!P.master[v];touch();T.G&&applyMix(T.G,P,false);tabRender();break;
  case 'sr':expSr=+v;SV('st_sr',expSr);tabRender();break;
  case 'render':doRender();break;
  case 'resAdd':addFiles([resFile()],'studio').then(()=>toast('Added to My music ✓'));break;
  case 'resDl':{const x=document.createElement('a');x.href=RES.url;x.download=resFile().name;document.body.append(x);x.click();x.remove();break}
  case 'resSh':{const f=resFile();if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:RES.name}).catch(()=>{});else toast('Sharing not supported here — use Download');break}
 }});
sr_.addEventListener('input',e=>{const t=e.target;
 if(t.dataset.m){const c=P.chans.find(x=>x.id===t.dataset.c);c[t.dataset.m]=+t.value;t.nextElementSibling.textContent=t.value;T.G&&applyMix(T.G,P,false);touch()}
 else if(t.dataset.mm&&t.type==='range'){P.master[t.dataset.mm]=+t.value;t.nextElementSibling.textContent=t.value;T.G&&applyMix(T.G,P,false);touch()}
 else if(t.dataset.pp){P[t.dataset.pp]=+t.value;t.nextElementSibling.textContent=t.value;T.dirty=true;touch()}});
sr_.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.mm&&t.tagName==='SELECT'){P.master[t.dataset.mm]=t.value;T.G&&applyMix(T.G,P,false);touch()}
 else if(t.dataset.a==='scale'){P.scale=t.value;touch();T.dirty=true;tabRender()}});
$('#stBack').onclick=()=>{if(P){stopPlay(true);clearTimeout(saveT);saveAll();P=null;render()}else back()};
$('#stMore').onclick=()=>sheet(`<b>${E(P.name)}</b>`,[{ic:'✏️',t:'Rename song',fn:()=>{const r=ask('Song name',P.name);if(r){P.name=r;touch();$('#stTitle').textContent=r}}},
 {ic:'🎼',t:'Key: '+NN[P.key]+' (change)',fn:()=>setTimeout(()=>sheet('<b>Choose a key</b>',NN.map((n,i)=>({ic:i===P.key?'✅':'🎵',t:n,fn:()=>{P.key=i;touch();T.dirty=true}}))),50)},
 {ic:'🥁',t:'Drum kit: '+P.kit,fn:()=>setTimeout(()=>sheet('<b>Drum kit</b>',Object.keys(KITS).map(k=>({ic:k===P.kit?'✅':'🥁',t:k,fn:()=>{P.kit=k;touch();T.dirty=true}}))),50)},
 {ic:'❓',t:'How to use LB Studio',fn:()=>tour(0)}]);

/* ===================== Create hub + navigation ===================== */
function renderCreate(){$('#crBody').innerHTML=[['🎹','LB Studio','Full music studio: drums, melody, whole-song arranger, mixer. Make a 4-minute song in 1 tap.','studio'],['🎙','Song Lab','Record your voice over a beat, section by section.','lab'],['⚡','Quick beat maker','Fast loops and beats in seconds.','maker']].map(([i,t,d,p])=>`<button class="s-card" data-go="${p}" style="display:flex;gap:14px;align-items:center;width:100%;text-align:left;border-left:4px solid var(--ac)"><span style="font-size:32px">${i}</span><span><b style="font-size:16px">${t}</b><div class="mut" style="font-size:12.5px;margin-top:3px">${d}</div></span></button>`).join('');
 $('#crBody').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go))}
R.create=renderCreate;R.studio=render;
const lb=$('#nav [data-p=lab]');if(lb){lb.dataset.p='create';lb.setAttribute('onclick',"show('create')");lb.innerHTML='<span>🎹</span>Create'}
const _show=window.show;
window.show=function(id,nh){if(id!=='studio'&&T.on)stopPlay();const r=_show(id,nh);if(id==='lab'||id==='studio')document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.p==='create'));return r};
['#au','#au2'].forEach(s=>{const a=$(s);a&&a.addEventListener('play',()=>{if(T.on)stopPlay()})});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&P){clearTimeout(saveT);saveAll()}});
window.LBS={T,get P(){return P},openProj,newSong,render,PROJ:()=>PROJ,startPlay,stopPlay,doRender,setTab:k=>{TAB=k;render()},tour};
render();
})();
