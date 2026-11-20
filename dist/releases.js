'use strict';
const menu=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','메뉴 열기');navigation.classList.remove('open');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');navigation.classList.toggle('open',open);});
navigation.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
const releaseTabs=[document.querySelector('#notice-tab'),document.querySelector('#update-tab')];
const releasePanels=[document.querySelector('#notice-panel'),document.querySelector('#update-panel')];
const releaseMotionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
const releaseMotionRuns=new Map();
const releaseScrollGroups=new Map();
function stopReleaseMotion(root){
  const animations=releaseMotionRuns.get(root);
  releaseMotionRuns.delete(root);
  if(animations)animations.forEach(animation=>animation.cancel());
}
function playReleaseMotion(root){
  stopReleaseMotion(root);
  const group=releaseScrollGroups.get(root);
  if(!group||releaseMotionPreference.matches)return;
  const animations=group.items().filter(item=>typeof item.animate==='function').map((item,index)=>{
    const from={opacity:0,transform:`translateY(${group.unfold?14:28}px)`};
    const to={opacity:1,transform:'translateY(0)'};
    if(group.unfold){from.clipPath='inset(0 0 100% 0)';to.clipPath='inset(0)';}
    return item.animate([from,to],{duration:group.unfold?480:700,delay:Math.min(index,12)*(group.unfold?65:100),easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
  });
  releaseMotionRuns.set(root,animations);
  Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>{
    if(releaseMotionRuns.get(root)===animations)releaseMotionRuns.delete(root);
  });
}
function replayReleasePanel(index){
  const root=releasePanels[index],group=releaseScrollGroups.get(root);
  if(group){group.visible=true;playReleaseMotion(root);}
}
function selectReleaseTab(index,focus=false,animate=true){
  releasePanels.forEach(panel=>{stopReleaseMotion(panel);const group=releaseScrollGroups.get(panel);if(group)group.visible=false;});
  releaseTabs.forEach((tab,id)=>{const selected=id===index;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;releasePanels[id].hidden=!selected;if(selected&&focus)tab.focus();});
  if(animate)replayReleasePanel(index);
}
releaseTabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectReleaseTab(index));
  tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowLeft'||event.key==='ArrowRight')next=1-index;else if(event.key==='Home')next=0;else if(event.key==='End')next=1;else return;event.preventDefault();selectReleaseTab(next,true);});
});
const platformTabs=[document.querySelector('#windows-tab'),document.querySelector('#macos-tab')];
const platformPanels=[document.querySelector('#windows-updates'),document.querySelector('#macos-updates')];
function selectPlatformTab(index,focus=false,animate=true){
  platformTabs.forEach((tab,id)=>{const selected=id===index;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;platformPanels[id].hidden=!selected;if(selected&&focus)tab.focus();});
  if(animate&&!releasePanels[1].hidden)replayReleasePanel(1);
}
platformTabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectPlatformTab(index));
  tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowLeft'||event.key==='ArrowRight')next=1-index;else if(event.key==='Home')next=0;else if(event.key==='End')next=1;else return;event.preventDefault();selectPlatformTab(next,true);});
});
const releaseQuery=new URLSearchParams(window.location.search);
selectReleaseTab(releaseQuery.get('tab')==='notice'?0:1,false,false);
selectPlatformTab(releaseQuery.get('os')==='macos'?1:0,false,false);

// Observe stable boxes and animate their contents so scrolling cannot retrigger itself.
const releaseHero=document.querySelector('.release-hero .section-wrap');
const releaseContent=document.querySelector('.release-content');
const releaseSupport=document.querySelector('.release-support');
releaseScrollGroups.set(releaseHero,{items:()=>Array.from(releaseHero.children),visible:false});
releaseScrollGroups.set(releaseContent,{items:()=>[document.querySelector('.release-tabs')],visible:false});
releaseScrollGroups.set(releasePanels[0],{items:()=>Array.from(releasePanels[0].querySelectorAll('.release-notice')),unfold:true,visible:false});
releaseScrollGroups.set(releasePanels[1],{items:()=>{
  const timeline=platformPanels.find(panel=>!panel.hidden);
  return [document.querySelector('.release-platform-tabs'),...timeline.querySelectorAll('.release-platform-heading,.release-version-heading,.release-version li')];
},unfold:true,visible:false});
releaseScrollGroups.set(releaseSupport,{items:()=>Array.from(releaseSupport.children),visible:false});
if('IntersectionObserver' in window){
  const releaseObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const group=releaseScrollGroups.get(entry.target);
      if(!entry.isIntersecting){group.visible=false;stopReleaseMotion(entry.target);}
      else if(entry.intersectionRatio>=.1&&!entry.target.hidden&&!group.visible){group.visible=true;playReleaseMotion(entry.target);}
    });
  },{threshold:[0,.1]});
  releaseScrollGroups.forEach((group,root)=>releaseObserver.observe(root));
}else{
  releaseScrollGroups.forEach((group,root)=>{if(!root.hidden)playReleaseMotion(root);});
}
releaseMotionPreference.addEventListener('change',()=>{
  if(releaseMotionPreference.matches)Array.from(releaseMotionRuns.keys()).forEach(stopReleaseMotion);
});
