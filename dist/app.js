'use strict';
const characters = [
  ['치즈냥','고양이','familiar'],['네이비냥','고양이','familiar'],['말티즈','강아지','familiar'],['푸들','강아지','familiar'],
  ['골든햄','햄스터','familiar'],['회색햄','햄스터','familiar'],['밤다람','다람쥐','forest'],['눈다람','다람쥐','forest'],
  ['삼색기니','기니피그','familiar'],['복실기니','기니피그','familiar'],['백토끼','토끼','forest'],['회색토끼','토끼','forest'],
  ['갈색쿼카','쿼카','special'],['크림쿼카','쿼카','special'],['초록개골','개구리','special'],['청개골','개구리','special'],
  ['구름양','양','special'],['초코양','양','special'],['노랑삐약','병아리','familiar'],['검정삐약','병아리','familiar'],
  ['갈색몽키','원숭이','special'],['황금몽키','원숭이','special'],['주황여우','여우','forest'],['북극여우','여우','forest'],
  ['브라운곰','곰','forest'],['북극곰','곰','forest']
].map(([name,species,group],id)=>({id,name,species,group}));
const asset = id => `assets/front-${String(id).padStart(2,'0')}.png`;
const grid = document.querySelector('#friends-grid');
const allButton = document.querySelector('#show-all');
let selectedFilter = 'all', expanded = false;
const firstFriends = [0,2,4,10,12,24,6,8,14,16,18,22];
function renderFriends() {
  const filtered = characters.filter(c=>selectedFilter==='all'||c.group===selectedFilter);
  const visible = selectedFilter==='all'&&!expanded ? firstFriends.map(id=>characters[id]) : filtered;
  grid.replaceChildren(...visible.map(c=>{
    const card=document.createElement('article'); card.className='friend-card';
    card.innerHTML=`<h3>${c.name}</h3><div class="friend-photo"><img src="assets/photo-${String(c.id).padStart(2,'0')}.png" alt="${c.name} 기본 자세" width="84" height="112" loading="lazy"></div><p>${c.species}</p>`;
    return card;
  }));
  allButton.hidden=selectedFilter!=='all';
  allButton.setAttribute('aria-expanded',String(expanded));
  allButton.innerHTML=expanded?'친구들 접어두기 <span>↑</span>':'26종 친구들 모두 만나기 <span>↓</span>';
}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  selectedFilter=button.dataset.filter; expanded=false;
  document.querySelectorAll('[data-filter]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  renderFriends();
}));
allButton.addEventListener('click',()=>{expanded=!expanded;renderFriends();if(!expanded)document.querySelector('#friends').scrollIntoView({behavior:'smooth',block:'start'});});
renderFriends();

const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','메뉴 열기');nav.classList.remove('open');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');nav.classList.toggle('open',open);});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

// This demo is isolated in memory. It never accesses the app, clipboard, or accounts.
const bubble=document.querySelector('#demo-bubble'),demoContent=document.querySelector('#demo-content');
let demoType=null,remaining=1500,endAt=null,timer=null;
const demoTasks=[{text:'기분 좋게 하루 시작하기',done:true},{text:'차근차근, 기획안 마무리',done:false},{text:'나를 위한 잠깐의 산책',done:false}];
let demoNote='오늘의 작은 아이디어를 적어보세요.\n\n천천히 해도 괜찮아 🌱';
const clockFormat = seconds => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
function updateClock(){
  if(endAt){remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));if(!remaining){clearInterval(timer);timer=null;endAt=null;}}
  document.querySelector('#mini-timer').textContent=clockFormat(remaining);
  const display=document.querySelector('#demo-time');if(display)display.textContent=clockFormat(remaining);
  const button=document.querySelector('#timer-toggle');if(button)button.textContent=endAt?'잠깐 쉬기':remaining===0?'다시 시작하기':'집중 시작하기';
}
function openDemo(type){
  if(demoType===type&&!bubble.hidden){closeDemo();return;}
  demoType=type;bubble.hidden=false;
  document.querySelectorAll('[data-demo]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.demo===type)));
  if(type==='timer'){
    demoContent.innerHTML='<h3>집중 타이머</h3><span class="demo-sub">치즈냥과 함께하는 작은 집중</span><div class="demo-time" id="demo-time">25:00</div><button class="button" id="timer-toggle">집중 시작하기</button><p class="demo-disclaimer">웹 체험이에요. 실제 앱과 연동되지 않아요.</p>';
    document.querySelector('#timer-toggle').addEventListener('click',()=>{if(endAt){updateClock();endAt=null;clearInterval(timer);timer=null;}else{if(remaining===0)remaining=1500;endAt=Date.now()+remaining*1000;timer=setInterval(updateClock,250);}updateClock();});
    updateClock();
  }else if(type==='todo'){
    demoContent.innerHTML='<h3>오늘의 체크리스트</h3><span class="demo-sub">백토끼가 하나씩 함께할게요.</span>';
    demoTasks.forEach((task,index)=>{const label=document.createElement('label');label.className='demo-task';const input=document.createElement('input');input.type='checkbox';input.checked=task.done;input.addEventListener('change',()=>{task.done=input.checked;const count=demoTasks.filter(t=>!t.done).length;document.querySelector('.pet-rabbit .pet-label b').textContent=count?`${count}개 남았어요`:'모두 끝냈어요!';});label.append(input,document.createTextNode(task.text));demoContent.append(label);});
    const note=document.createElement('p');note.className='demo-disclaimer';note.textContent='웹 체험이에요. 새로고침하면 초기화돼요.';demoContent.append(note);
  }else{
    demoContent.innerHTML='<h3>반짝이는 생각 보관함</h3><span class="demo-sub">브라운곰의 작은 메모장</span><textarea aria-label="체험용 메모" maxlength="500"></textarea><p class="demo-disclaimer">입력 내용은 전송·저장되지 않으며 새로고침하면 사라져요.</p>';
    const area=demoContent.querySelector('textarea');area.value=demoNote;area.addEventListener('input',()=>{demoNote=area.value;});
  }
}
function closeDemo(){bubble.hidden=true;demoType=null;document.querySelectorAll('[data-demo]').forEach(b=>b.setAttribute('aria-expanded','false'));}
document.querySelectorAll('[data-demo]').forEach(button=>{button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','demo-bubble');button.addEventListener('click',()=>openDemo(button.dataset.demo));});
document.querySelector('.bubble-close').addEventListener('click',closeDemo);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!bubble.hidden){const trigger=document.querySelector(`[data-demo="${demoType}"]`);closeDemo();trigger?.focus();}});
document.addEventListener('click',e=>{if(!bubble.hidden&&!e.target.closest('.demo-bubble')&&!e.target.closest('[data-demo]'))closeDemo();});

const scenes={
  work:{pet:24,name:'브라운곰',label:'퇴근까지 남은 시간',value:'02:34:18',note:'오늘도 충분히 잘하고 있어요.',kicker:'바쁜 업무 사이, 작은 여유',title:['일은 똑똑하게,','기다림은 귀엽게.'],description:'자주 쓰는 문구는 한 번에 복사하고, 회의 일정은 미리 챙겨요. 퇴근까지 남은 시간도 친구와 함께라면 조금 더 즐거워요.',tags:['자주 쓰는 문구','일정','퇴근·점심시간']},
  study:{pet:0,name:'치즈냥',label:'오늘의 집중 시간',value:'25:00',note:'한 번에 하나씩, 우리 같이 해요.',kicker:'꾸준한 나를 위한 작은 응원',title:['집중은 차곡차곡,','성취는 하나씩.'],description:'집중 타이머로 나만의 리듬을 만들고, 오늘 공부할 내용은 체크리스트에 적어요. 떠오른 질문은 메모장에 남겨두면 든든해요.',tags:['집중 타이머','체크리스트','메모장']},
  daily:{pet:12,name:'갈색쿼카',label:'다가오는 나의 휴일',value:'D−4',note:'작은 기대가 하루를 바꿔줄 거예요.',kicker:'평범한 하루에 다정함 한 스푼',title:['소중한 날은 챙기고,','작은 생각은 담아요.'],description:'다가오는 생일과 기념일을 챙기고, 좋아하는 사이트를 바로 열어보세요. 쉬는 날을 기다리는 작은 설렘까지 친구와 나눠요.',tags:['일정','사이트 바로가기','휴일']}
};
const sceneTabs=[...document.querySelectorAll('[data-scene]')];
function selectScene(button){const s=scenes[button.dataset.scene];sceneTabs.forEach(b=>{b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1;});document.querySelector('#day-panel').setAttribute('aria-labelledby',button.id);const image=document.querySelector('#scene-image');image.src=`assets/edge-left-${String(s.pet).padStart(2,'0')}.png`;image.alt=s.name;document.querySelector('#scene-widget-label').textContent=s.label;document.querySelector('#scene-widget-value').textContent=s.value;document.querySelector('#scene-widget-note').textContent=s.note;document.querySelector('#day-kicker').textContent=s.kicker;const title=document.querySelector('#scene-title');title.replaceChildren(document.createTextNode(s.title[0]),document.createElement('br'),document.createTextNode(s.title[1]));document.querySelector('#scene-description').textContent=s.description;document.querySelector('#scene-tags').replaceChildren(...s.tags.map(t=>{const span=document.createElement('span');span.textContent=t;return span;}));}
sceneTabs.forEach((button,index)=>{button.addEventListener('click',()=>selectScene(button));button.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight')target=sceneTabs[(index+1)%sceneTabs.length];if(e.key==='ArrowLeft')target=sceneTabs[(index-1+sceneTabs.length)%sceneTabs.length];if(e.key==='Home')target=sceneTabs[0];if(e.key==='End')target=sceneTabs[sceneTabs.length-1];if(target){e.preventDefault();selectScene(target);target.focus();}});});

const dialog=document.querySelector('#info-dialog');
function showInfo(type){const content=document.querySelector('#dialog-content');content.innerHTML=type==='support'?'<h2 id="dialog-title">친구에게 이야기해주세요.</h2><p>기능 제안이나 오류를 알려주고 싶다면 앱에서 <b>설정 → 의견 및 문의</b>를 열어주세요.</p><p>기능 제안 또는 오류 신고를 선택해 내용을 작성할 수 있어요. 오류 신고에는 답변받을 이메일과 사용 환경을 함께 적어주세요.</p><p class="notice">공식 고객지원 이메일과 운영자 정보는 공개 출시 전에 이곳에 안내할 예정이에요.</p>':'<h2 id="dialog-title">첫 만남을 준비하고 있어요.</h2><p>Twigly의 공개 다운로드 파일은 아직 준비 중이에요. 배포를 시작하면 이곳에서 바로 받을 수 있어요.</p><p class="notice">지원 환경: macOS 13 이상 · Apple Silicon Mac<br>현재 프로젝트의 앱은 로컬 데모 빌드예요.</p><h3>배포가 시작되면, 이렇게 만나요.</h3><ol><li>이 페이지에서 Mac용 설치 파일을 받아요.</li><li>Twigly 앱을 응용 프로그램 폴더로 옮겨요.</li><li>앱을 열고 안내에 따라 동물 위젯을 만나요.</li></ol>';dialog.showModal();}
document.querySelector('#download-button').addEventListener('click',()=>showInfo('download'));
document.querySelectorAll('[data-dialog]').forEach(b=>b.addEventListener('click',()=>showInfo(b.dataset.dialog)));
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());document.querySelector('.dialog-confirm').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});

// Use the app-rendered crop and mirrored pose for the chosen screen edge.
const desktop = document.querySelector('.desktop');
const demoPetIDs = {timer:0,todo:10,note:24};
document.querySelectorAll('[data-placement]').forEach(button=>button.addEventListener('click',()=>{
 const edge=button.dataset.placement;desktop.dataset.edge=edge;closeDemo();
 document.querySelectorAll('[data-placement]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 document.querySelectorAll('[data-demo]').forEach(pet=>{pet.querySelector('img').src=`assets/edge-${edge}-${String(demoPetIDs[pet.dataset.demo]).padStart(2,'0')}.png`;});
}));
