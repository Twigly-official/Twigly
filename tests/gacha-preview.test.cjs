const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/app.js'),'utf8');
const code=source.slice(source.indexOf('// Native presentation video:'),source.indexOf('const howAssignment='));
function setup(reduced=false,rejectPlay=false){
 const media={matches:reduced,addEventListener(_type,fn){this.changed=fn;}};
 const document={hidden:false,events:{},addEventListener(type,fn){this.events[type]=fn;}};
 const video={plays:0,pauses:0,currentTime:2,readyState:1,play(){this.plays++;return rejectPlay?Promise.reject(Error('blocked')):Promise.resolve();},pause(){this.pauses++;}};
 const context=vm.createContext({window:{matchMedia:()=>media},document,$:selector=>selector==='#gacha-preview-video'?video:{}});
 vm.runInContext(code,context);
 return {video,media,document,visit:visible=>vm.runInContext(`gachaVisible=${visible};syncGachaPlayback()`,context)};
}
test('automatic preview plays only while visible; re-entry resets and tab hiding pauses',()=>{
 const ui=setup();ui.visit(true);assert.equal(ui.video.plays,1);
 ui.video.currentTime=3;ui.document.hidden=true;ui.document.events.visibilitychange();assert.equal(ui.video.currentTime,3);assert.equal(ui.video.pauses,1);
 ui.document.hidden=false;ui.document.events.visibilitychange();assert.equal(ui.video.plays,2);
 ui.visit(false);assert.equal(ui.video.currentTime,0);ui.visit(true);assert.equal(ui.video.plays,3);
 ui.media.matches=true;ui.media.changed();assert.equal(ui.video.currentTime,0);assert.equal(ui.video.plays,3);
});
test('reduced motion stays static; playback restrictions leave a safe poster fallback',async()=>{
 const ui=setup(true,true);ui.visit(true);assert.equal(ui.video.plays,0);assert.equal(ui.video.currentTime,0);
 ui.media.matches=false;ui.media.changed();await Promise.resolve();assert.equal(ui.video.plays,1);
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
 const step=html.slice(html.indexOf('<span class="step-label">STEP 1'),html.indexOf('<span class="step-label">STEP 2'));
 assert(!step.includes('<button'));assert(step.includes('muted loop playsinline preload="none"'));assert(step.includes('native-gacha-cinema.mp4'));
 assert(!source.includes('playHowDraw')&&!source.includes('draw-demo'));
 assert(source.includes("gachaObserver.observe(gachaPreview.closest('.how-row'))"));
});
