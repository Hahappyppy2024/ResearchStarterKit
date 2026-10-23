(()=>{
 const KEY='research-theme-v1',HUB='http://127.0.0.1:8769',allowed=new Set([8766,8767,8768,8769,8770,8791,4173,8772].map(p=>'http://127.0.0.1:'+p));allowed.add('http://localhost:8769');let current='green',changed=false;try{current=localStorage.getItem(KEY)||current}catch{}
 function apply(theme){if(!['green','blue'].includes(theme))return;current=theme;document.documentElement.dataset.researchTheme=theme;try{localStorage.setItem(KEY,theme)}catch{}for(const b of document.querySelectorAll('[data-palette]'))b.setAttribute('aria-pressed',String(b.dataset.palette===theme))}
 function broadcast(){for(const frame of document.querySelectorAll('iframe')){try{const origin=new URL(frame.src).origin;if(allowed.has(origin))frame.contentWindow.postMessage({type:'research-theme',theme:current},origin)}catch{}}}
 async function choose(theme){changed=true;apply(theme);broadcast();try{const r=await fetch(HUB+'/api/theme',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({theme})});if(!r.ok)throw Error('主题已保存在浏览器，本机偏好保存失败');document.querySelector('.research-theme-switch')?.setAttribute('title','主题已保存，刷新后保留')}catch(e){document.querySelector('.research-theme-switch')?.setAttribute('title',e.message)}}
 apply(current);
 // Map existing palette declarations onto shared tokens; preserve warm warning/error colors.
 function mapped(hex,property){let raw=hex.slice(1);if(raw.length===3||raw.length===4)raw=raw.split('').map(c=>c+c).join('');if(raw.length!==6&&raw.length!==8)return hex;const values=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16)/255),max=Math.max(...values),min=Math.min(...values),light=(max+min)/2,delta=max-min;let hue=0;if(delta){const [r,g,b]=values;hue=60*(max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4);if(hue<0)hue+=360}const saturation=delta/(1-Math.abs(2*light-1)||1);if(saturation>.3&&(hue<75||hue>300)&&light<.85)return hex;if(raw.length===8&&raw.slice(6)!=='ff')return hex;const bg=property.includes('background'),border=/border|outline/.test(property);if(light>.975)return bg?'var(--theme-paper)':hex;if(light>.94)return bg?(delta>.04?'var(--theme-soft)':'var(--theme-bg)'):'var(--theme-line)';if(light>.86)return bg?'var(--theme-soft)':'var(--theme-line)';if(light>.73)return bg?'var(--theme-soft)':'var(--theme-line)';if(light<.25)return bg?'var(--theme-strong)':'var(--theme-ink)';return saturation>.18?'var(--theme-accent)':bg?'var(--theme-soft)':'var(--theme-muted)'}
 function rules(list){let out='';for(const r of list){if(r.selectorText&&r.style){let declarations='';for(const property of r.style){if(!/(color|background|border|outline|fill|stroke|shadow)/.test(property)||property.startsWith('--'))continue;const original=r.style.getPropertyValue(property),value=original.replace(/#[0-9a-f]{3,8}\b/gi,h=>mapped(h,property)).replace(/rgba?\([^)]+\)/gi,color=>{const numbers=color.match(/[\d.]+/g)?.map(Number);if(!numbers||numbers.length<3||numbers.length>3&&numbers[3]<1)return color;const hex='#'+numbers.slice(0,3).map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');return mapped(hex,property)});if(value!==original)declarations+=property+':'+value+(r.style.getPropertyPriority(property)?' !important':'')+';'}if(declarations)out+=r.selectorText+'{'+declarations+'}'}else if(r.cssRules&&r.conditionText)out+=(r.constructor.name==='CSSSupportsRule'?'@supports ':'@media ')+r.conditionText+'{'+rules(r.cssRules)+'}'}return out}
 const mappedStyle=document.createElement('style');mappedStyle.id='research-theme-mapped';let css='';for(const sheet of document.styleSheets){if(sheet.href?.includes('research-theme.css'))continue;try{css+=rules(sheet.cssRules)}catch{}}mappedStyle.textContent=css;if(location.port!=='8769')document.head.append(mappedStyle);
 if(parent===window){const switcher=document.createElement('div');switcher.className='research-theme-switch';switcher.setAttribute('role','group');switcher.setAttribute('aria-label','网站主题颜色');for(const [id,label] of [['green','绿色'],['blue','蓝色']]){const b=document.createElement('button');b.type='button';b.dataset.palette=id;const dot=document.createElement('span');dot.className='theme-'+id+'-dot';b.append(dot,document.createTextNode(label));b.onclick=()=>choose(id);switcher.append(b)}const header=document.querySelector('.hub-header');if(header)header.append(switcher);else{switcher.classList.add('research-theme-floating');document.body.append(switcher)}}
 apply(current);document.querySelectorAll('iframe').forEach(f=>f.addEventListener('load',broadcast));window.addEventListener('storage',e=>{if(e.key===KEY){apply(e.newValue);broadcast()}});
 window.addEventListener('message',e=>{if(!allowed.has(e.origin))return;if(e.data?.type==='research-theme-ready'&&parent===window&&[...document.querySelectorAll('iframe')].some(f=>f.contentWindow===e.source))e.source.postMessage({type:'research-theme',theme:current},e.origin);if(e.data?.type==='research-theme'&&e.source===parent&&allowed.has(e.origin)){changed=true;apply(e.data.theme)}});
 if(parent!==window){let parentOrigin=HUB;try{const referrerOrigin=new URL(document.referrer).origin;if(allowed.has(referrerOrigin))parentOrigin=referrerOrigin}catch{}parent.postMessage({type:'research-theme-ready'},parentOrigin)}
 fetch(HUB+'/api/theme',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d&&!changed){apply(d.theme);broadcast()}}).catch(()=>{});
})();

// One navigation design for the hub and every standalone local page.
(()=>{
 const hub='http://127.0.0.1:8769/';
 const entries=[['daily','每日努力','Daily Effort'],['arxiv','arXiv 每周论文','Weekly Papers'],['courses','我的课程','My Courses'],['reading','今日必读','Must Read'],['atlas','论文脉络','Paper Atlas'],['scholars','实验室与学者','Labs & Scholars'],['library','论文库','Paper Library'],['projects','项目实验本','Projects Notebook'],['learning','基础知识','AI Foundations'],['blog','Blog','Research Blog'],['methods','科研方法','Research Methods']];
 const existing=document.querySelector('.hub-header');
 if(existing){existing.classList.add('research-nav-host');return}
 const embedded=window.parent!==window;document.body.classList.add(embedded?'research-embedded':'research-has-topbar');
 for(const old of document.querySelectorAll('header.topbar')){
  for(const brand of old.querySelectorAll('.brand'))brand.hidden=true;
  if(!old.querySelector('button,input,select,label'))old.hidden=true;
  else old.classList.add('research-page-tools');
 }
 if(embedded)return;
 let active='daily';const p=location.pathname,port=location.port;
 if(port==='8767')active='library';else if(port==='8768')active='poetry';else if(port==='8791')active='scholars';else if(port==='8770'||port==='8771')active=p.startsWith('/learning')?'learning':'projects';else if(port==='4173')active='atlas';else if(/arxiv/.test(p))active='arxiv';else if(/courses/.test(p))active='courses';else if(/reading|paper-questions|paper-week/.test(p))active='reading';else if(/lineage|taxonomy|datasets/.test(p))active='atlas';else if(/library/.test(p))active='library';else if(/labs/.test(p))active='scholars';else if(/blog/.test(p))active='blog';else if(/methods/.test(p))active='methods';
 const header=document.createElement('header');header.className='hub-header research-nav-host research-shared-header';
 const brand=document.createElement('a');brand.className='hub-brand';brand.href=hub+'#daily';
 const mark=document.createElement('span');mark.className='brand-mark';mark.textContent='研';
 const title=document.createElement('span');title.textContent='我的研究桌面';const subtitle=document.createElement('small');subtitle.textContent='世上无难事，只要肯登攀。';subtitle.title='毛泽东《水调歌头·重上井冈山》';title.append(subtitle);brand.append(mark,title);header.append(brand);
 const nav=document.createElement('nav');nav.className='hub-tabs';nav.setAttribute('aria-label','研究网站切换');
 for(const [id,zh,en] of entries){const a=document.createElement('a');a.href=hub+'#'+id;a.dataset.site=id;a.textContent=zh;const small=document.createElement('small');small.textContent=en;a.append(small);if(id===active)a.setAttribute('aria-current','page');nav.append(a)}
 const badge=document.createElement('span');badge.className='local-badge';badge.textContent='LOCAL · 仅本机';header.append(nav,badge);document.body.prepend(header);
 const switcher=document.querySelector('.research-theme-switch');if(switcher){switcher.classList.remove('research-theme-floating');header.append(switcher)}
 const measure=()=>document.documentElement.style.setProperty('--research-topbar-height',header.getBoundingClientRect().height+'px');measure();new ResizeObserver(measure).observe(header);
})();

// Screenshot paste is stored as a local Markdown image link, never as base64 in notes.
(()=>{
 if(window.__researchPasteInstalled)return;
 window.__researchPasteInstalled=true;
 const endpoint='http://127.0.0.1:8766/api/study/paste-image';
 const pattern=/!\[[^\]]*\]\((http:\/\/127\.0\.0\.1:8766\/api\/study\/paste-image\?id=[a-f0-9-]{36})\)/g;
 const fields=new WeakMap();
 const style=document.createElement('style');
 style.textContent='.research-paste-preview{display:block;margin:6px 0;font-size:12px;color:var(--theme-muted,#666)}.research-inline-shot{display:inline-block;vertical-align:middle;max-width:120px!important;max-height:90px!important;width:auto;height:auto;object-fit:contain;border:1px solid var(--theme-line,#ccc);border-radius:8px;margin:4px}.research-saved-shot{display:inline-block;max-width:100%;vertical-align:middle}.research-paste-status{font-size:12px;color:var(--theme-muted,#666)}';
 document.head.append(style);
 function state(field){let item=fields.get(field);if(!item){item={};fields.set(field,item);}return item;}
 function preview(field){
  const item=state(field),count=new Set([...field.value.matchAll(pattern)].map(m=>m[1])).size;
  if(!count){item.box?.remove();item.box=null;return;}
  if(!item.box?.isConnected){item.box=document.createElement('div');item.box.className='research-paste-preview';field.after(item.box);}
  const text='已附 '+count+' 张截图 · 保存内容后显示，点击缩略图可放大';
  if(item.box.textContent!==text)item.box.textContent=text;
 }
 document.addEventListener('paste',async event=>{
  const field=event.target;
  if(!(field instanceof HTMLTextAreaElement||field instanceof HTMLInputElement&&['text','search'].includes(field.type)))return;
  const files=[...(event.clipboardData?.items||[])].filter(i=>i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);
  if(!files.length)return;
  event.preventDefault();
  const item=state(field);item.status?.remove();
  const status=document.createElement('p');item.status=status;status.className='research-paste-status';status.setAttribute('role','status');status.textContent='正在保存截图到本机……';field.after(status);
  let cursor=field.selectionStart??field.value.length;
  try{
   for(const file of files){
    if(file.size>8*1024*1024)throw Error('单张截图最大 8 MB');
    const image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})}),data=await response.json();
    if(!response.ok)throw Error(data.error||'截图保存失败');
    const markdown='\n![截图]('+data.url+')\n';
    if(field.maxLength>0&&field.value.length+markdown.length>field.maxLength)throw Error('这个字段字数上限不足，请放到笔记或任务说明中');
    field.setRangeText(markdown,cursor,cursor,'end');cursor+=markdown.length;
    field.dispatchEvent(new Event('input',{bubbles:true}));
   }
   status.textContent='截图已存到本机；请按当前表单的保存方式保存内容。';preview(field);
  }catch(e){status.textContent=e.message;}
  setTimeout(()=>status.remove(),6000);
 });
 document.addEventListener('input',e=>{if(e.target.matches('textarea,input'))preview(e.target);});
 let pending=false;
 function scan(){
  pending=false;
  for(const f of document.querySelectorAll('textarea,input[type=text],input:not([type])'))if(fields.has(f)||f.value.includes('/api/study/paste-image?id='))preview(f);
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode()){
   const n=walker.currentNode;
   if(n.textContent.includes('/api/study/paste-image?id=')&&!n.parentElement.closest('textarea,input,script,style,pre,code,.research-paste-preview,.research-paste-status,[contenteditable="true"]'))nodes.push(n);
  }
  for(const n of nodes){
   const text=n.textContent,matches=[...text.matchAll(pattern)];if(!matches.length)continue;
   const fragment=document.createDocumentFragment(),seen=new Set();let at=0;
   for(const m of matches){
    fragment.append(document.createTextNode(text.slice(at,m.index)));
    if(!seen.has(m[1])){
     seen.add(m[1]);const a=document.createElement('a'),img=document.createElement('img');
     a.href=m[1];a.target='_blank';a.rel='noopener';a.className='research-saved-shot';a.title='点击查看原图';
     img.src=m[1];img.alt='截图（点击放大）';img.className='research-inline-shot';img.loading='lazy';a.append(img);fragment.append(a);
    }
    at=m.index+m[0].length;
   }
   fragment.append(document.createTextNode(text.slice(at)));n.replaceWith(fragment);
  }
 }
 new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(scan);}}).observe(document.body,{childList:true,subtree:true});
 scan();
})();
