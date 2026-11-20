const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const source=fs.readFileSync(new URL('../dist/contact.js',`file://${__filename}`),'utf8');
function setup(transport){
 class E{constructor(){this.events={};this.value='';this.textContent='';this.attrs={};}addEventListener(k,fn){this.events[k]=fn;}setAttribute(k,v){this.attrs[k]=v;}setCustomValidity(s){this.error=s;}focus(){this.focused=true;}}
 const content=new E(),email=new E(),form=new E(),dialog=new E(),status=new E(),send=new E(),close=new E(),opener=new E(),toast=new E();
 form.elements={namedItem:name=>name==='reply_email'?email:content};form.reportValidity=()=>!content.error&&!email.error&&!!email.value.trim()&&!!content.value.trim();dialog.showModal=()=>dialog.open=true;dialog.close=()=>{dialog.open=false;dialog.events.close();};
 const elements={'#contact-dialog':dialog,'#contact-form':form,'#contact-status':status,'#contact-send':send,'.contact-close':close,'#contact-toast':toast};
 const timers=new Map();let nextTimer=0;
 vm.runInNewContext(source,{document:{querySelector:s=>elements[s],querySelectorAll:()=>[opener]},crypto:{randomUUID},fetch:transport,AbortSignal,setTimeout:(fn,ms)=>{assert.equal(ms,3500);timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id)});
 return {content,email,form,dialog,status,send,close,opener,toast,submit:()=>form.events.submit({preventDefault(){}}),expireToast:()=>{for(const fn of [...timers.values()])fn();}};
}
test('both valid email and content are required; success clears both and closes with a toast',async()=>{
 let calls=0;
 const ui=setup(async(url,options)=>{calls++;assert(url.endsWith('/twigly-web-support'));assert.equal(options.credentials,'omit');const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body).sort(),['content','reply_email','request_id']);assert.equal(body.reply_email,'review+qa@example.com');return Response.json({id:body.request_id,received:true});});
 assert(ui.send.disabled);
 ui.opener.events.click();ui.content.value=' ';await ui.submit();assert.equal(calls,0);
 ui.content.value='문의 내용 & 한글';ui.form.events.input();assert(ui.send.disabled);
 for(const address of ['','not-an-email','review@example','a@@example.com','user@example.com\nBcc:other@example.com']){ui.email.value=address;ui.form.events.input();assert(ui.send.disabled,address);await ui.submit();assert.equal(calls,0);}
 ui.email.value='review+qa@example.com';ui.form.events.input();assert(!ui.send.disabled);
 ui.content.value=' \n ';ui.form.events.input();assert(ui.send.disabled);
 ui.content.value='문의 내용 & 한글';ui.form.events.change();assert(!ui.send.disabled);
 await ui.submit();assert.equal(calls,1);assert.equal(ui.content.value,'');assert.equal(ui.email.value,'');assert(ui.send.disabled);assert.equal(ui.toast.textContent,'소중한 의견을 보내주셔서 감사해요!');assert.equal(ui.status.textContent,'');assert.equal(ui.form.attrs['aria-busy'],'false');assert(!ui.dialog.open&&ui.opener.focused);
 ui.expireToast();assert.equal(ui.toast.textContent,'');
 assert(!/mailto:|clipboard|contact-copy|kindInputs/.test(source));
});
test('failed retries keep the content and request ID; editing creates a new ID',async()=>{
 const bodies=[];
 const ui=setup(async(_url,options)=>{bodies.push(JSON.parse(options.body));return Response.json({error:{code:'SUPPORT_UNAVAILABLE'}},{status:503});});
 ui.email.value='review@example.com';ui.content.value='남겨둔 문의';await ui.submit();await ui.submit();assert.equal(ui.content.value,'남겨둔 문의');assert.equal(ui.email.value,'review@example.com');assert.equal(bodies[0].request_id,bodies[1].request_id);
 ui.email.value='updated@example.com';await ui.submit();assert.notEqual(bodies[2].request_id,bodies[1].request_id);assert.equal(bodies[2].reply_email,'updated@example.com');
 ui.content.value='수정한 문의';await ui.submit();assert.notEqual(bodies[3].request_id,bodies[2].request_id);assert(!ui.send.disabled);
});
test('in-flight send cannot duplicate or dismiss; unconfirmed response never clears input',async()=>{
 let respond,calls=0;
 const ui=setup(async()=>{calls++;return new Promise(resolve=>respond=resolve);});
 ui.email.value='review@example.com';ui.content.value='진행 중 문의';ui.opener.events.click();const sending=ui.submit();
 assert(ui.send.disabled&&ui.close.disabled&&ui.content.readOnly&&ui.email.readOnly);let cancelled=false;ui.dialog.events.cancel({preventDefault(){cancelled=true;}});assert(cancelled);
 await ui.submit();assert.equal(calls,1);ui.close.events.click();assert(ui.dialog.open);
 respond(Response.json({id:randomUUID(),received:true}));await sending;assert.equal(ui.content.value,'진행 중 문의');assert(ui.status.textContent.includes('확인하지 못'));
 assert(ui.dialog.open);assert.equal(ui.toast.textContent,'');
 ui.close.events.click();assert(!ui.dialog.open&&ui.opener.focused);
});
