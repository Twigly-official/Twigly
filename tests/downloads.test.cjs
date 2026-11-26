const {test}=require('node:test');
const assert=require('node:assert/strict');
const {installerFor,init}=require('../dist/downloads.js');
const root='https://github.com/Twigly-official/Twigly';
const asset=(name)=>({name,size:123,state:'uploaded',browser_download_url:`${root}/releases/download/v2.0.0/${name}`});
const release=(assets)=>({tag_name:'v2.0.0',html_url:`${root}/releases/tag/v2.0.0`,assets});
function ui(){
 const elements={};
 for(const id of ['windows-download','windows-download-label','windows-version','windows-release','windows-download-status']) elements[`#${id}`]={href:`${root}/releases/latest`,textContent:''};
 return {elements,document:{querySelector:selector=>elements[selector]}};
}
test('only supported uploaded x64 installers are eligible; stable alias wins',()=>{
 const valid=asset('TwiglyApp-win-Setup.exe');
 const assets=[asset('licenses.zip'),asset('TwiglyApp-2.0.0-full.nupkg'),asset('TwiglyApp-win-Portable.zip'),asset('TwiglyApp-win-arm64-Setup.exe'),asset('TwiglyApp-2.0.0-Setup.exe'),valid];
 assert.equal(installerFor(release(assets)),valid);
 assert.equal(installerFor(release([assets[4]])),assets[4]);
 for(const r of [{...release(assets),draft:true},{...release(assets),prerelease:true},release(assets.slice(0,4)),release([{...valid,state:'new'}]),release([{...valid,size:0}]),release([{...valid,browser_download_url:'https://example.com/setup.exe'}])]) assert.equal(installerFor(r),null);
});
test('a newer release updates the version, direct installer and matching notes',async()=>{
 const view=ui(),installer=asset('TwiglyApp-win-Setup.exe');
 await init(view.document,async(url,options)=>{
   assert.equal(url,'https://api.github.com/repos/Twigly-official/Twigly/releases/latest');
   assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');
   return Response.json(release([installer]));
 });
 assert.equal(view.elements['#windows-version'].textContent,'Twigly v2.0.0');
 assert.equal(view.elements['#windows-download'].href,installer.browser_download_url);
 assert.equal(view.elements['#windows-release'].href,`${root}/releases/tag/v2.0.0`);
 assert.equal(view.elements['#windows-download-label'].textContent,'Windows 다운로드 (x64)');
});
test('missing installers retain usable release links without claiming a download',async()=>{
 const view=ui();await init(view.document,async()=>Response.json(release([asset('licenses.zip')])));
 assert.equal(view.elements['#windows-download'].href,`${root}/releases/latest`);
 assert.match(view.elements['#windows-download-status'].textContent,/설치 파일을 준비/);
});
test('network, rate limit, no release and invalid responses provide release fallback',async()=>{
 for(const transport of [async()=>{throw new Error('offline');},async()=>new Response('',{status:403}),async()=>new Response('',{status:404}),async()=>Response.json(null),async()=>Response.json({...release([]),draft:true})]) {
   const view=ui();await init(view.document,transport);
   assert.equal(view.elements['#windows-download'].href,`${root}/releases/latest`);
   assert.equal(view.elements['#windows-download-label'].textContent,'Windows 릴리즈 확인');
   assert.match(view.elements['#windows-download-status'].textContent,/불러오지 못/);
 }
});
