// Testet die GPS-Bruecke in index.html gegen ein simuliertes Capacitor-Plugin (kein Handy noetig).
import fs from 'fs'; import vm from 'vm'; import assert from 'assert';
const src = fs.readFileSync(process.argv[2] || "index.html", 'utf8');
const html = src; const a = html.indexOf('// ── CAPACITOR BRIDGE'); const b = html.indexOf('// ── ENDE CAPACITOR BRIDGE');
const code = html.slice(a, b);
function mkEnv({native=true, asyncId=false, notif=true}={}){
  const active = new Map(); let n=0; const log=[]; let notifAsk=0;
  const plugin = {
    addWatcher(opts, cb){ const id='cb'+(++n); active.set(id,{opts,cb}); log.push(['add',id,!!opts.backgroundMessage]); return asyncId? new Promise(r=>setTimeout(()=>r(id),5)) : id; },
    removeWatcher({id}){ log.push(['remove',id]); active.delete(id); return Promise.resolve(); },
  };
  const geo = { calls:[], watchPosition(){this.calls.push('watch'); return 7;}, clearWatch(id){this.calls.push('clear'+id);}, getCurrentPosition(ok){this.calls.push('get'); ok({coords:{}});} };
  const Plugins = {BackgroundGeolocation:plugin};
  if (notif) Plugins.LocalNotifications = { requestPermissions(){ notifAsk++; return Promise.resolve({display:'granted'}); } };
  const window = { Capacitor: native? { isNativePlatform:()=>true, Plugins } : undefined,
    SCKR_BUILD:{branding:{appTitle:'Testbuch'}} };
  const ctx = { window, navigator:{geolocation:geo}, setTimeout, clearTimeout, Promise, console };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  return { G: window.SCKR_GPS, active, log, geo, notifAsks:()=>notifAsk,
    fire:(l)=>[...active.values()].forEach(w=>w.cb(l)), failAll:(e)=>[...active.values()].forEach(w=>w.cb(undefined,e)) };
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const L={latitude:52.3,longitude:13.6,accuracy:5,speed:null,bearing:90,altitude:null,time:1000};
for (const asyncId of [false,true]) {
  // 1 start/stop removes watcher
  let e=mkEnv({asyncId}); let pts=[];
  let id=await e.G.watchPosition(p=>pts.push(p));
  assert.equal(id,'capacitor-watch'); assert.equal(e.active.size,1);
  e.fire(L); assert.equal(pts.length,1); assert.equal(pts[0].coords.speed,0); assert.equal(pts[0].coords.heading,90);
  assert.ok(e.log[0][2], 'background notification set');
  await e.G.clearWatch(id); assert.equal(e.active.size,0,'stopped');
  // 2 repeated rearm never stacks watchers
  for(let i=0;i<5;i++) await e.G.watchPosition(()=>{}); assert.equal(e.active.size,1,'max one watcher');
  await e.G.clearWatch('capacitor-watch'); assert.equal(e.active.size,0);
  // 3 stop while start in flight -> no leak
  const pr=e.G.watchPosition(()=>{}); e.G.clearWatch('capacitor-watch'); const r=await pr; await sleep(20);
  assert.equal(e.active.size,0,'no leak after stop-during-start'); assert.equal(r,null);
  // 4 getCurrentPosition native -> one fix, temp watcher removed, no notification
  let got=null; e.G.getCurrentPosition(p=>got=p, x=>{throw x}); await sleep(10); e.fire(L); await sleep(10);
  assert.ok(got); assert.equal(e.active.size,0,'temp watcher removed');
  // 5 timeout
  let errd=null; e.G.getCurrentPosition(()=>{}, x=>errd=x, {timeout:30}); await sleep(60);
  assert.equal(errd.code,3); assert.equal(e.active.size,0,'temp watcher removed after timeout');
  // 5b parallel starts (e.g. rearm during start) -> still max one watcher
  await Promise.all([e.G.watchPosition(()=>{}), e.G.watchPosition(()=>{}), e.G.watchPosition(()=>{})]);
  assert.equal(e.active.size,1,'parallel starts -> one watcher'); assert.equal(e.G._activeCount(),1);
  // 5c permission error -> watcher removed, count 0 so rearm can restart
  let gotErr=null; await e.G.clearWatch('capacitor-watch'); await e.G.watchPosition(()=>{}, x=>gotErr=x);
  e.failAll({code:'NOT_AUTHORIZED',message:'denied'}); await sleep(10);
  assert.equal(gotErr.code,'NOT_AUTHORIZED'); assert.equal(e.active.size,0); assert.equal(e.G._activeCount(),0,'failed watcher dropped');
  assert.equal(e.notifAsks(),1,'notification permission asked exactly once');
  // 6 legacy 'cap' id
  await e.G.watchPosition(()=>{}); await e.G.clearWatch('cap'); assert.equal(e.active.size,0);
}
// 6b no LocalNotifications plugin -> still works
{ const e=mkEnv({notif:false}); assert.equal(await e.G.watchPosition(()=>{}),'capacitor-watch'); await e.G.clearWatch('capacitor-watch'); assert.equal(e.active.size,0); }
// 7 web fallback
let w=mkEnv({native:false}); assert.equal(await w.G.watchPosition(()=>{}),7); w.G.clearWatch(7); w.G.getCurrentPosition(()=>{});
assert.deepEqual(w.geo.calls,['watch','clear7','get']);
console.log('ALLE GPS-TESTS OK');
