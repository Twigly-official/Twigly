'use strict';
// Public, fictional examples only. No accounts, storage, clipboard or network access.
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pad = value => String(value).padStart(2, '0');
const portrait = id => `assets/native-front-${pad(id)}.png`;
const edgeArt = (id, side) => `assets/native-edge-${side}-${pad(id)}.png`;
const edgeSprite = (id, side) => `assets/native-edge-sprite-${side}-${pad(id)}.png`;
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const names = ['치즈냥','네이비냥','말티즈','푸들','골든햄','회색햄','밤다람','눈다람','삼색기니','복실기니','백토끼','회색토끼','갈색쿼카','크림쿼카','초록개골','청개골','구름양','초코양','노랑삐약','검정삐약','갈색몽키','황금몽키','사막여우','북극여우','브라운곰','북극곰'];
const species = ['고양이','강아지','햄스터','다람쥐','기니피그','토끼','쿼카','개구리','양','병아리','원숭이','여우','곰'];
const characters = names.map((name,id) => ({name,id,species:species[Math.floor(id/2)]}));
const abilities = [
  {name:'퇴근·점심시간', title:'퇴근·점심 카운트다운',icon:'clock',description:'점심과 퇴근까지, 기다리는 시간을 함께 세어요.',character:0,label:'퇴근까지',value:'02:21:55'},
  {name:'집중 타이머',title:'집중 타이머',icon:'timer',description:'집중과 휴식에 나만의 리듬을 만들어요.',character:1,label:'집중 시간',value:'25:00'},
  {name:'일정',title:'회의·일정 알림',icon:'calendar',description:'회의부터 생일·기념일까지, 중요한 날을 챙겨요.',character:4,label:'팀 회의',value:'14:00'},
  {name:'휴일',title:'주말·공휴일 카운트다운',icon:'sun',description:'다가오는 주말과 공휴일을 함께 기다려요.',character:6,label:'휴일',value:'D−2'},
  {name:'클립보드',title:'클립보드 기록',icon:'clipboard',description:'최근 복사한 텍스트 5개를 저장하고 검색해요.',character:8,label:'클립보드',value:'5/5'},
  {name:'사이트 바로가기',title:'자주 쓰는 사이트',icon:'link',description:'최대 5개의 즐겨 찾는 사이트를 한 번에 열어요.',character:22,label:'사이트',value:'3개'},
  {name:'자주 쓰는 문구',title:'자주 쓰는 문구',icon:'quote',description:'반복해서 쓰는 문구를 최대 5개까지 저장해요.',character:12,label:'저장 문구',value:'3개'},
  {name:'체크리스트',title:'체크리스트',icon:'check',description:'오늘 할 일을 하나씩 가볍게 끝내요.',character:16,label:'남은 할 일',value:'3개'},
  {name:'월급날',title:'월급날 카운트다운',icon:'card',description:'다음 월급날까지 남은 날을 알려줘요.',character:21,label:'월급날',value:'D−13'},
  {name:'메모장',title:'메모장',icon:'note',description:'떠오른 생각을 놓치기 전에 자유롭게 적어요.',character:18,label:'메모장',value:'오늘의 작은 생각'}
];

const menu = $('.menu-toggle'), navigation = $('#navigation');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','메뉴 열기');navigation.classList.remove('open');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');navigation.classList.toggle('open',open);});
navigation.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));

// Two copies of each 13-character group make the loop seamless.
function createFriendCard(character){
  const article=document.createElement('article');
  article.className='friend-card';
  article.innerHTML=`<img src="assets/native-photo-${pad(character.id)}.png" alt="${character.name} — 보유 위젯과 같은 초록색 그라데이션 배경" width="336" height="448" decoding="async"><h3>${character.name}</h3><p>${character.species}</p>`;
  return article;
}
const friendsCarousel=$('#friends-carousel');
for(const [index,group] of [characters.slice(0,13),characters.slice(13,26)].entries()){
  const viewport=document.createElement('div');viewport.className='friends-viewport';viewport.setAttribute('role','group');viewport.setAttribute('aria-label',index===0?'위쪽 사무실 메이트 13종 · 오른쪽으로 이동':'아래쪽 사무실 메이트 13종 · 왼쪽으로 이동');
  const track=document.createElement('div');track.className=`friends-track ${index===0?'moves-right':'moves-left'}`;
  const original=document.createElement('div');original.className='friends-group';original.replaceChildren(...group.map(createFriendCard));
  const copy=original.cloneNode(true);copy.setAttribute('aria-hidden','true');
  track.append(original,copy);viewport.append(track);friendsCarousel.append(viewport);
}
const featureTabs=$('#feature-tabs');
featureTabs.innerHTML=[0,5].map(start=>`<div class="feature-tab-row" role="presentation">${abilities.slice(start,start+5).map((ability,index)=>{
  const id=start+index;
  return `<button type="button" class="feature-chip" id="feature-tab-${id}" role="tab" aria-selected="${id===0}" aria-controls="feature-preview" tabindex="${id===0?0:-1}" data-feature="${id}">${icon(ability.icon)}<span>${ability.title}</span></button>`;
}).join('')}</div>`).join('');
const featurePreviewPanel=$('#feature-preview');
const featurePreviewContent=$('#feature-preview-content');
const featurePreviewImage=$('#feature-preview-image');
const featurePreviewStatus=$('#feature-preview-status');
const featureImageCache=new Map();
let featureRequested=0,featureDisplayed=0,featureSwitchRevision=0;
let featureContentAnimation=null,featureSizeAnimation=null;
function updateFeatureTabs(id,moveFocus=false){
  featureTabs.querySelectorAll('[role="tab"]').forEach((tab,index)=>{const selected=index===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;if(selected&&moveFocus)tab.focus();});
}
function loadFeatureImage(id){
  if(featureImageCache.has(id))return featureImageCache.get(id);
  const image=new Image();
  const source=`assets/feature-previews/feature-${pad(id)}@4x.png`;
  const ready=typeof image.decode==='function'?(image.src=source,image.decode().then(()=>image)):new Promise((resolve,reject)=>{image.onload=()=>resolve(image);image.onerror=reject;image.src=source;});
  const result=ready.catch(error=>{featureImageCache.delete(id);throw error;});
  featureImageCache.set(id,result);return result;
}
function cancelFeatureContentAnimation(){if(featureContentAnimation){featureContentAnimation.cancel();featureContentAnimation=null;}}
function resizeFeaturePreview(previousHeight,withMotion){
  if(featureSizeAnimation){featureSizeAnimation.cancel();featureSizeAnimation=null;}
  featurePreviewPanel.classList.remove('is-switching');
  const nextHeight=featurePreviewPanel.getBoundingClientRect().height;
  if(!withMotion||Math.abs(previousHeight-nextHeight)<1)return;
  featurePreviewPanel.classList.add('is-switching');
  const animation=featurePreviewPanel.animate([{height:`${previousHeight}px`},{height:`${nextHeight}px`}],{duration:280,easing:'cubic-bezier(.22,1,.36,1)'});
  featureSizeAnimation=animation;
  animation.finished.catch(()=>{}).then(()=>{if(featureSizeAnimation===animation){animation.cancel();featureSizeAnimation=null;featurePreviewPanel.classList.remove('is-switching');}});
}
async function selectFeature(id,moveFocus=false){
  updateFeatureTabs(id,moveFocus);
  if(id===featureRequested)return;
  featureRequested=id;const revision=++featureSwitchRevision;
  cancelFeatureContentAnimation();
  if(id===featureDisplayed){featurePreviewPanel.setAttribute('aria-busy','false');return;}
  featurePreviewPanel.setAttribute('aria-busy','true');
  let nextImage;
  try{nextImage=await loadFeatureImage(id);}catch{
    if(revision===featureSwitchRevision){featureRequested=featureDisplayed;updateFeatureTabs(featureDisplayed);featurePreviewPanel.setAttribute('aria-busy','false');featurePreviewStatus.textContent='미리보기를 불러오지 못했어요. 기능을 다시 선택해주세요.';featurePreviewStatus.hidden=false;}
    return;
  }
  if(revision!==featureSwitchRevision)return;
  const withMotion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&typeof featurePreviewContent.animate==='function'&&typeof featurePreviewPanel.animate==='function';
  if(withMotion){
    const outgoing=featurePreviewContent.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:110,easing:'ease-out',fill:'forwards'});
    featureContentAnimation=outgoing;
    await outgoing.finished.catch(()=>{});
    if(revision!==featureSwitchRevision)return;
  }
  const previousHeight=featurePreviewPanel.getBoundingClientRect().height;
  const ability=abilities[id];
  featurePreviewPanel.setAttribute('aria-labelledby',`feature-tab-${id}`);
  $('#feature-preview-title').textContent=ability.name;
  $('#feature-preview-description').textContent=ability.description;
  featurePreviewImage.width=nextImage.naturalWidth;featurePreviewImage.height=nextImage.naturalHeight;
  featurePreviewImage.src=nextImage.src;featurePreviewImage.alt=`${ability.name} 위젯의 실제 기능 화면`;
  featureDisplayed=id;featurePreviewStatus.textContent='';featurePreviewStatus.hidden=true;
  cancelFeatureContentAnimation();resizeFeaturePreview(previousHeight,withMotion);
  featurePreviewPanel.setAttribute('aria-busy','false');
  if(withMotion){
    const incoming=featurePreviewContent.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:230,easing:'cubic-bezier(.22,1,.36,1)'});
    featureContentAnimation=incoming;
    incoming.finished.catch(()=>{}).then(()=>{if(featureContentAnimation===incoming){incoming.cancel();featureContentAnimation=null;}});
  }
}
featureTabs.querySelectorAll('[role="tab"]').forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectFeature(index));
  tab.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowRight')next=(index+1)%abilities.length;
    else if(event.key==='ArrowLeft')next=(index+abilities.length-1)%abilities.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=abilities.length-1;
    else return;
    event.preventDefault();selectFeature(next,true);
  });
});

// The desktop preview shows characters and summaries without opening tool panels.
const placements=[
  {side:'left',items:[0,4,7,9,2].map(ability=>({ability}))},
  {side:'right',items:[1,8,3,6,5].map(ability=>({ability}))}
];
for(const {side,items} of placements){
  for(const [index,{ability,character:overrideCharacter}] of items.entries()){
    const a=abilities[ability], character=overrideCharacter??a.character;
    const summaryId=`desktop-summary-${side}-${index}`;
    const row=document.createElement('div');row.className='widget-row';
    const animal=document.createElement('button');animal.className='pet-button';animal.type='button';animal.setAttribute('aria-label',`${names[character]} 요약 접기·펼치기`);animal.setAttribute('aria-expanded','true');animal.setAttribute('aria-controls',summaryId);animal.title='더블클릭해서 요약 박스를 접고 펼쳐요';const sprite=document.createElement('span');sprite.className='pet-sprite';sprite.setAttribute('role','img');sprite.setAttribute('aria-label',names[character]);
    // 8-frame native peek animation; staggered so neighbours never move together.
    const order=side==='left'?index*2:index*2+1;
    sprite.style.cssText=`background-image:url("${edgeSprite(character,side)}");--sprite-cycle:${(6.4+order%4*0.55).toFixed(2)}s;--sprite-delay:${(0.4+order*1.37%6.2).toFixed(2)}s`;
    animal.append(sprite);
    const summary=document.createElement('div');summary.className='quick-summary';summary.id=summaryId;summary.innerHTML=`<small>${a.label}</small><strong>${a.value}</strong>`;
    function toggleSummary(){const hidden=!summary.hidden;summary.hidden=hidden;animal.setAttribute('aria-expanded',String(!hidden));}
    animal.addEventListener('dblclick',toggleSummary);
    animal.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSummary();}});
    row.append(animal,summary);$(`#${side}-widgets`).append(row);
  }
}
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});

// Native presentation video: only visible previews play; no draw or account API.
const howReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gachaPreview=$('.gacha-preview');
const gachaVideo=$('#gacha-preview-video');
const gachaMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let gachaVisible=false;
function syncGachaPlayback(){
  if(gachaVisible&&!document.hidden&&!gachaMotion.matches){
    gachaVideo.play().catch(()=>{});
  }else{
    gachaVideo.pause();
    if((!gachaVisible||gachaMotion.matches)&&gachaVideo.readyState>0)gachaVideo.currentTime=0;
  }
}
gachaMotion.addEventListener('change',syncGachaPlayback);
document.addEventListener('visibilitychange',syncGachaPlayback);

const howAssignment=$('.assignment-preview');
const howAbilityOrder=[0,8,3,2,4,6,5,9,7,1];
const howAbilityDetails=['점심과 퇴근까지, 설레는 시간을 세어요.','집중과 휴식에 나만의 리듬을 만들어요.','회의부터 생일·기념일까지, 중요한 일정을 알려드려요.','다가오는 쉬는 날을 함께 기다려요.','최근 복사한 텍스트 5개를 찾아요.','자주 가는 웹사이트를 한 번에 열어요.','매번 쓰는 문구를 한 번에 복사해요.','오늘 할 일을 하나씩 가볍게 끝내요.','다음 월급날까지 남은 날을 세어요.','떠오른 생각과 필요한 내용을 자유롭게 적어요.'];
$('#how-ability-grid').innerHTML=howAbilityOrder.map((id,index)=>`<div class="how-ability" data-how-ability="${id}" role="listitem">${icon(abilities[id].icon)}<span class="how-ability-copy"><span class="how-ability-title"><small>${pad(index+1)}</small><strong>${abilities[id].name}</strong></span><span class="how-ability-detail">${howAbilityDetails[id]}</span></span><i aria-hidden="true"></i></div>`).join('');
const howAbilityCards=$$('[data-how-ability]');
let howAssignmentVisible=false,howHighlight=0,howHighlightTimer=null;
function stopHowHighlight(){if(howHighlightTimer!==null){clearInterval(howHighlightTimer);howHighlightTimer=null;}howAbilityCards.forEach(card=>card.classList.remove('is-suggested'));}
function startHowHighlight(){
  stopHowHighlight();
  if(!howAssignmentVisible||!howAbilityCards.length)return;
  howAbilityCards[howHighlight].classList.add('is-suggested');
  if(howReducedMotion)return;
  howHighlightTimer=setInterval(()=>{howAbilityCards[howHighlight].classList.remove('is-suggested');howHighlight=(howHighlight+1)%howAbilityCards.length;howAbilityCards[howHighlight].classList.add('is-suggested');},900);
}

$$('.placement-control [data-edge]').forEach(button=>button.addEventListener('click',()=>{
  const side=button.dataset.edge;$('#placement-canvas').dataset.edge=side;
  $('#placement-pet').src=edgeArt(4,side);$('#placement-pet').alt=`${side==='left'?'왼쪽':'오른쪽'} 가장자리에 배치된 골든햄`;
  $$('.placement-control [data-edge]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
}));

if('IntersectionObserver' in window){
  // Observe stable layout boxes; only their contents move during the reveal.
  // Re-arm after the whole box leaves the viewport, without resetting demo state.
  const howRevealGroups=new Map();
  const heading=$('#how .center-heading');
  const headingContents=Array.from(heading.children);
  headingContents.forEach(element=>element.classList.add('how-reveal-item'));
  howRevealGroups.set(heading,headingContents);
  $$('#how .how-row').forEach(row=>howRevealGroups.set(row,[row.querySelector('.how-copy'),row.querySelector('.how-visual')]));
  const featureHeading=$('#features .center-heading');
  const featurePanel=$('#feature-preview');
  for(const trigger of [featureHeading,featureTabs,featurePanel]){
    const elements=Array.from(trigger.children);
    elements.forEach(element=>element.classList.add('feature-reveal-item'));
    howRevealGroups.set(trigger,elements);
  }
  for(const trigger of [$('#download .section-heading'),$('#download .download-grid')]){
    const elements=Array.from(trigger.children);
    elements.forEach(element=>element.classList.add('download-reveal-item'));
    howRevealGroups.set(trigger,elements);
  }
  howRevealGroups.set($('.desktop-preview-trigger'),[$('#playground')]);
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const elements=howRevealGroups.get(entry.target);
      if(entry.isIntersecting&&entry.intersectionRatio>=.15)elements.forEach(element=>element.classList.remove('how-reveal-pending'));
      else if(!entry.isIntersecting)elements.forEach(element=>element.classList.add('how-reveal-pending'));
    });
  },{threshold:[0,.15]});
  if(!howReducedMotion)howRevealGroups.forEach((elements,trigger)=>{elements.forEach(element=>element.classList.add('how-reveal-pending'));revealObserver.observe(trigger);});
  const gachaObserver=new IntersectionObserver(entries=>{gachaVisible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.15;syncGachaPlayback();},{threshold:[0,.15]});gachaObserver.observe(gachaPreview.closest('.how-row'));
  const assignmentObserver=new IntersectionObserver(entries=>{howAssignmentVisible=entries[0].isIntersecting;if(howAssignmentVisible)startHowHighlight();else stopHowHighlight();},{threshold:.3});assignmentObserver.observe(howAssignment);
  const placementObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){$('.placement-preview').classList.add('how-preview-active');placementObserver.disconnect();}},{threshold:.4});placementObserver.observe($('.placement-preview'));
}else{
  gachaVisible=true;syncGachaPlayback();howAssignmentVisible=true;startHowHighlight();$('.placement-preview').classList.add('how-preview-active');
}

const dialog=$('#info-dialog');
function showInfo(title,paragraphs){const content=$('#dialog-content');content.replaceChildren();const heading=document.createElement('h2');heading.id='dialog-title';heading.textContent=title;content.append(heading);paragraphs.forEach(text=>{const p=document.createElement('p');p.textContent=text;content.append(p);});dialog.showModal();}
$$('[data-download]').forEach(button=>button.addEventListener('click',()=>showInfo(`${button.dataset.download==='mac'?'Mac':'Windows'} 배포를 준비하고 있어요`,['현재 공개 다운로드 파일은 준비 중이에요. 배포가 시작되면 이곳에서 설치 파일과 설치 방법을 안내할게요.','페이지 위의 데스크톱 미리보기에서 메이트의 배치를, 주요 기능 영역에서 실제 기능 화면을 살펴보세요.'])));
$('.dialog-close').addEventListener('click',()=>dialog.close());$('.dialog-confirm').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
