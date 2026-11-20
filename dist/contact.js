'use strict';
(() => {
  const dialog=document.querySelector('#contact-dialog');
  const form=document.querySelector('#contact-form');
  const content=form.elements.namedItem('content');
  const replyEmail=form.elements.namedItem('reply_email');
  const status=document.querySelector('#contact-status');
  const sendButton=document.querySelector('#contact-send');
  const closeButton=document.querySelector('.contact-close');
  const toast=document.querySelector('#contact-toast');
  const endpoint='https://ygovjotfqiawjidbvsya.supabase.co/functions/v1/twigly-web-support';
  class ContactError extends Error {}
  const emailPattern=/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i;
  const validEmail=value=>value.length<=254&&emailPattern.test(value);
  let sending=false,attempt=null,opener=null,toastTimer=null;
  function updateSendButton(){
    const message=content.value.trim();
    sendButton.disabled=sending||!validEmail(replyEmail.value.trim())||!message||[...message].length>4000;
  }
  function hideSuccess(){
    if(toastTimer!==null)clearTimeout(toastTimer);
    toastTimer=null;toast.textContent='';
  }
  function showSuccess(){
    hideSuccess();toast.textContent='소중한 의견을 보내주셔서 감사해요!';
    toastTimer=setTimeout(hideSuccess,3500);
  }
  function setSending(value){
    sending=value;closeButton.disabled=value;content.readOnly=value;replyEmail.readOnly=value;
    sendButton.textContent=value?'보내는 중…':'보내기';form.setAttribute('aria-busy',String(value));
    updateSendButton();
  }
  function updateFields(){content.setCustomValidity('');replyEmail.setCustomValidity('');status.textContent='';updateSendButton();}
  form.addEventListener('input',updateFields);
  form.addEventListener('change',updateFields);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(sending)return;
    const message=content.value.trim();content.setCustomValidity(message?'':'문의 내용을 입력해주세요.');
    const email=replyEmail.value.trim();replyEmail.setCustomValidity(validEmail(email)?'':'올바른 답변 받을 이메일을 입력해주세요.');
    updateSendButton();
    if(!form.reportValidity())return;
    if(!attempt||attempt.content!==message||attempt.reply_email!==email)attempt={request_id:crypto.randomUUID(),content:message,reply_email:email};
    const submitted=attempt;let completed=false;status.textContent='';setSending(true);
    try{
      const response=await fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(submitted),signal:AbortSignal.timeout(45_000)});
      const result=await response.json().catch(()=>null);
      if(!response.ok){
        const code=result?.error?.code;
        if(code==='INVALID_ARGUMENT'||code==='BODY_TOO_LARGE')throw new ContactError('이메일 형식과 문의 내용(최대 4,000자)을 확인해주세요.');
        if(code==='SUPPORT_RATE_LIMITED')throw new ContactError('잠시 문의가 많아 전송하지 못했어요. 잠시 후 다시 시도해주세요.');
        if(code==='SUPPORT_RETRY_EXPIRED'||code==='SUPPORT_CONFLICT'){attempt=null;throw new ContactError('문의를 다시 보내주세요. 작성한 내용은 그대로 남아 있어요.');}
        throw new ContactError('지금은 문의를 보내지 못했어요. 잠시 후 다시 시도해주세요.');
      }
      if(result?.received!==true||result.id!==submitted.request_id)throw new ContactError('전송 결과를 확인하지 못했어요. 다시 시도해주세요.');
      content.value='';replyEmail.value='';attempt=null;completed=true;
    }catch(error){
      status.textContent=error instanceof ContactError?error.message:'문의를 보내지 못했어요. 네트워크를 확인한 뒤 다시 시도해주세요.';
    }finally{setSending(false);}
    if(completed){dialog.close();showSuccess();}
  });
  document.querySelectorAll('[data-contact-open]').forEach(button=>button.addEventListener('click',()=>{opener=button;hideSuccess();status.textContent='';updateSendButton();dialog.showModal();}));
  closeButton.addEventListener('click',()=>{if(!sending)dialog.close();});
  dialog.addEventListener('cancel',event=>{if(sending)event.preventDefault();});
  dialog.addEventListener('close',()=>{if(opener)opener.focus({preventScroll:true});});
  updateSendButton();
})();
