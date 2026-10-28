function scholarPortrait(id,name){return `<div class="scholar-photo-box"><div class="scholar-photo" data-scholar-photo="${e(id)}" role="img" aria-label="${e(name)}照片">${e(name.slice(-2))}</div><label class="photo-upload">上传／换照片<input type="file" accept="image/jpeg,image/png,image/webp" data-photo-upload="${e(id)}" hidden></label></div>`;}
/* Buildless and offline: no network requests, remote fonts or third-party scripts. */
'use strict';
const DB = window.ATLAS;
const $ = s => document.querySelector(s);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topic = id => DB.topics.find(t => t.id === id);
const person = id => DB.people.find(p => p.id === id);
const ownWorks = id => DB.works.filter(w => w.person === id);
const normalize = s => s.toLowerCase().normalize('NFKC').replace(/丛鑫/g,'从鑫').replace(/[-–—]/g,' ');
let prefs = {saved:[],notes:{}};
let storageOK = true;
try { const saved = JSON.parse(localStorage.getItem('zhiyan-v1') || 'null'); if(saved) prefs = validateBackup(saved); } catch { storageOK = false; }
function validateBackup(v) {
  if(!v || !Array.isArray(v.saved) || !v.notes || typeof v.notes !== 'object' || Array.isArray(v.notes)) throw Error('备份结构不正确');
  const ids = new Set([...DB.people.map(p=>'p:'+p.id), ...DB.works.map(w=>'w:'+w.id)]);
  const notes = {};
  for (const [k,value] of Object.entries(v.notes)) if((ids.has(k)||/^p:tracked-[a-f0-9-]{36}$/.test(k)) && typeof value === 'string') notes[k] = value.slice(0,50000);
  return {saved:[...new Set(v.saved.filter(k => (ids.has(k)||/^p:tracked-[a-f0-9-]{36}$/.test(k))))],notes};
}
function persist() {try {localStorage.setItem('zhiyan-v1',JSON.stringify(prefs));return true;} catch {storageOK=false;toast('浏览器无法保存，请导出备份以保留记录');return false;}}
let state = {view:'overview',q:'',topic:'',who:'',kind:'',sort:'new'};
const titles = {overview:'研究总览',people:'学者索引',works:'论文与项目',map:'方向关联',saved:'我的收藏'};
function readRoute() {
  const [view,query=''] = location.hash.slice(1).split('?');
  const args = new URLSearchParams(query);
  state.view = titles[view] ? view : 'overview';
  state.q = args.get('q') || '';
  state.topic = DB.topics.some(t=>t.id===args.get('topic')) ? args.get('topic') : '';
  state.who = DB.people.some(p=>p.id===args.get('who')) ? args.get('who') : '';
  state.kind = args.get('kind') || '';state.sort = args.get('sort') || 'new';
  $('#search').value=state.q;render();
  const selected = args.get('person'); if(person(selected)) showPerson(selected);
  const work = DB.works.find(w=>w.id===args.get('work')); if(work) showWork(work.id);
}
function navigate(view,changes={}) {
  const next = {...state,...changes,view};const query = new URLSearchParams();
  for(const key of ['q','topic','who','kind','sort']) if(next[key] && !(key==='sort'&&next[key]==='new')) query.set(key,next[key]);
  const hash = '#'+view+(query.size?'?'+query:'');
  if(location.hash===hash) readRoute(); else location.hash=hash;
}
function toast(message) {$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function termsMatch(text) {const terms=normalize(state.q).trim().split(/\s+/).filter(Boolean);return terms.every(t=>normalize(text).includes(t));}
function personText(p) {return [p.name,p.en,...p.aliases,p.org,p.role,p.summary,p.talk,...p.tags,...p.research,...p.topics.map(t=>topic(t).name)].join(' ');}
function workText(w) {const p=person(w.person);return [w.title,w.summary,w.status,w.type,w.evidence,w.year,...w.tags,...w.topics.map(t=>topic(t).name),p.name,p.en,...p.aliases,p.org].join(' ');}
function matchingPeople() {return DB.people.filter(p=>(!state.topic||p.topics.includes(state.topic))&&(!state.who||p.id===state.who)&&termsMatch(personText(p)+' '+ownWorks(p.id).map(workText).join(' ')));}
function matchingWorks() {let list=DB.works.filter(w=>(!state.topic||w.topics.includes(state.topic))&&(!state.who||w.person===state.who)&&(!state.kind||w.type===state.kind)&&termsMatch(workText(w)));return list.sort((a,b)=>state.sort==='old'?(a.year||9999)-(b.year||9999):state.sort==='name'?a.title.localeCompare(b.title,'zh-CN'):(b.year||0)-(a.year||0));}
function saveButton(id) {const on=prefs.saved.includes(id);return `<button class="save ${on?'on':''}" data-save="${e(id)}" aria-label="${on?'取消收藏':'收藏'}" aria-pressed="${on}">${on?'★':'☆'}</button>`;}
function tags(list) {return `<div class="tags">${list.map(t=>`<button class="tag" data-query="${e(t)}">${e(t)}</button>`).join('')}</div>`;}
function extLink(url,label) {try {if(!/^https?:$/.test(new URL(url).protocol)) return '';} catch {return '';}return `<a class="link" href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`;}
function heading(title,sub='',more='') {return `<div class="section-heading"><div><h2>${e(title)}</h2>${sub?`<p>${e(sub)}</p>`:''}</div>${more}</div>`;}
function personCard(p) {return `<article class="person-card" style="--tone:${topic(p.topics[0]).color}"><div class="person-top">${scholarPortrait(p.id,p.name)}<div><button class="person-name" data-person="${p.id}">${e(p.name)}</button><div class="person-en">${e(p.en)}</div></div>${saveButton('p:'+p.id)}</div><div class="org">${e(p.org)} · ${e(p.role)}</div><p class="summary">${e(p.summary)}</p>${tags(p.tags.slice(0,3))}<div class="person-bottom"><span>${ownWorks(p.id).length} 项相关工作</span><button class="text-button" data-person="${p.id}">查看研究档案 →</button></div></article>`;}
function workCard(w) {const p=person(w.person);return `<article class="work" style="--tone:${topic(w.topics[0]).color}"><div class="work-symbol">▤</div><div class="work-main"><h3><button data-work="${w.id}">${e(w.title)}</button></h3><div class="meta"><button data-person="${p.id}">${e(p.name)}</button><span>${w.year||'持续更新'}</span><span class="type">${e(w.type)}</span><span class="${w.caution?'caution':''}">${e(w.status)}</span></div><p>${e(w.summary)}</p>${tags(w.tags)}<div class="links"><button class="text-button" data-work="${w.id}">详情与来源 →</button>${w.code?extLink(w.code,'代码'):''}</div></div>${saveButton('w:'+w.id)}</article>`;}
function empty(label) {return `<div class="empty"><strong>${e(label)}</strong><p>试试减少关键词，或重置方向、人物和类型筛选。</p><button class="chip" data-reset>重置全部筛选</button></div>`;}
function filters(includeWorks=false) {return `<div class="toolbar">${[{id:'',name:'全部方向'},...DB.topics].map(t=>`<button class="chip ${state.topic===t.id?'active':''}" data-topic="${t.id}">${e(t.name)}</button>`).join('')}<span class="spacer"></span>${includeWorks?`<select id="person-filter" aria-label="筛选学者"><option value="">全部学者</option>${DB.people.map(p=>`<option value="${p.id}" ${state.who===p.id?'selected':''}>${e(p.name)}</option>`).join('')}</select><select id="type-filter" aria-label="筛选成果类型"><option value="">全部类型</option>${[...new Set(DB.works.map(w=>w.type))].map(t=>`<option ${state.kind===t?'selected':''}>${e(t)}</option>`).join('')}</select><select id="sort" aria-label="排序"><option value="new" ${state.sort==='new'?'selected':''}>年份从新到旧</option><option value="old" ${state.sort==='old'?'selected':''}>年份从旧到新</option><option value="name" ${state.sort==='name'?'selected':''}>标题排序</option></select>`:''}${state.q||state.topic||state.who||state.kind?'<button class="chip" data-reset>重置</button>':''}</div>`;}
function externalSearch(q) {q=q.trim();return `<div class="external"><h3>${q?`继续查找“${e(q)}”`:'查找尚未收录的学者'}</h3><p>本地库收录研究者及精选工作，也可以在上方添加学者并开启 arXiv 追踪。${q?'以下入口会携带当前关键词打开外部网站；不会自动核验或收录结果。':'在顶部输入姓名和单位，即可使用下方入口联网查找。'} 外部检索和原文阅读需要联网。</p>${q?`<div class="links">${extLink('https://scholar.google.com/scholar?q='+encodeURIComponent(q),'Google Scholar')}${extLink('https://www.google.com/search?q='+encodeURIComponent(q+' 研究 个人主页'),'主页与研究')}${extLink('https://www.semanticscholar.org/search?q='+encodeURIComponent(q),'Semantic Scholar')}${extLink('https://www.baidu.com/s?wd='+encodeURIComponent(q+' 研究 论文'),'百度检索')}</div>`:''}</div>`;}
function overview() {
  const people=matchingPeople(),works=matchingWorks();
  if(state.q||state.topic||state.who||state.kind) return heading('检索结果',`${people.length} 位相关学者 · ${works.length} 项相关工作`)+filters()+heading('相关学者')+(people.length?`<div class="grid">${people.map(personCard).join('')}</div>`:empty('未找到匹配学者'))+heading('相关工作')+(works.length?`<div class="work-list">${works.map(workCard).join('')}</div>`:empty('本地库暂无匹配工作'))+externalSearch(state.q);
  return `<div class="stats">${[['◎',DB.people.length,'已收录学者'],['◈','4','研究主方向'],['▤',DB.works.length,'论文与项目'],['☆',prefs.saved.length,'我的收藏']].map(([icon,n,t])=>`<div class="stat"><span class="stat-icon">${icon}</span><div><strong>${n}</strong><small>${t}</small></div></div>`).join('')}</div>`+heading('探索研究方向','从四条主线出发，找到你关心的研究问题。','<a href="#map">查看方向关联 ↗</a>')+`<div class="topic-grid">${DB.topics.map((t,i)=>`<button class="topic-card" data-topic="${t.id}" style="--tone:${t.color}"><span class="topic-icon">${['✧','⌘','∑','▥'][i]}</span><h3>${e(t.name)}</h3><span class="english">${t.en}</span><p>${e(t.description)}</p><small>${DB.people.filter(p=>p.topics.includes(t.id)).length} 位学者 · ${DB.works.filter(w=>w.topics.includes(t.id)).length} 项工作　→</small></button>`).join('')}</div>`+heading('学者与研究','由你提供的 8 场报告出发，补充相关研究线索。','<a href="#people">全部学者 →</a>')+`<div class="grid">${DB.people.slice(0,6).map(personCard).join('')}</div>`+heading('继续了解','精选论文、平台与开源项目。','<a href="#works">全部工作 →</a>')+`<div class="work-list">${DB.works.filter(w=>['statform','harness','pdd'].includes(w.id)).map(workCard).join('')}</div>`+`<div class="notice">来源核验截至 ${DB.updated}。截图报告、作者主页、正式论文和公司产品分别标注；预印本不等同于正式发表。精选索引为人工整理；新论文追踪区会单独联网更新 arXiv。</div>`;
}
function mapView() {
  const centers=[{x:175,y:110},{x:675,y:110},{x:175,y:370},{x:675,y:370}];
  const points=[{x:320,y:50},{x:420,y:150},{x:670,y:240},{x:520,y:45},{x:225,y:240},{x:530,y:350},{x:730,y:460},{x:520,y:465}];
  let paths='',nodes='';
  DB.people.forEach((p,i)=>{const a=points[i]||{x:120+(i%5)*145,y:540+Math.floor((i-8)/5)*90};p.topics.forEach(t=>{const b=centers[DB.topics.findIndex(v=>v.id===t)];paths+=`<path d="M${a.x},${a.y} Q${(a.x+b.x)/2},${a.y} ${b.x},${b.y}" stroke="${topic(t).color}" opacity=".28" fill="none" stroke-width="1.6"/>`;});nodes+=`<g class="map-person" data-person="${p.id}" role="button" tabindex="0" aria-label="查看${e(p.name)}"><circle cx="${a.x}" cy="${a.y}" r="22" fill="white" stroke="${topic(p.topics[0]).color}"/><text x="${a.x}" y="${a.y+42}" text-anchor="middle">${e(p.name)}</text><text x="${a.x}" y="${a.y+5}" text-anchor="middle" style="font-size:14px;fill:${topic(p.topics[0]).color}">${e(p.name.slice(-1))}</text></g>`;});
  return heading('方向关联','点击学者查看工作，点击方向进入资料筛选。')+`<div class="map-panel"><svg viewBox="0 0 850 ${DB.people.length>8?630+Math.floor((DB.people.length-9)/5)*90:540}" role="group" aria-label="学者与研究方向的主题关联图">${paths}${centers.map((p,i)=>`<g class="map-topic" data-topic="${DB.topics[i].id}" role="button" tabindex="0" aria-label="筛选${DB.topics[i].name}"><rect x="${p.x-95}" y="${p.y-28}" width="190" height="56" rx="10" fill="${DB.topics[i].color}15" stroke="${DB.topics[i].color}50"/><text x="${p.x}" y="${p.y+5}" text-anchor="middle">${DB.topics[i].name}</text></g>`).join('')}${nodes}</svg><div class="legend">${DB.topics.map(t=>`<span style="--tone:${t.color}"><i class="dot"></i>${t.name}</span>`).join('')}</div></div><div class="notice">连线表示本站根据报告和已收录工作整理的研究主题关联，是编辑归类，不是论文合作网络。跨方向归类也不表示研究者自称属于该领域。</div>`;
}
function render() {
  $('#breadcrumb').textContent=titles[state.view];document.title=titles[state.view]+' · 知研';
  document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===state.view);if(a.dataset.nav===state.view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  let html='';
  if(state.view==='overview') html=overview();
  if(state.view==='people') {const list=matchingPeople();html=heading('学者索引',`${list.length} 位匹配学者 · 点击姓名查看研究档案与相关工作。`)+filters()+(list.length?`<div class="grid">${list.map(personCard).join('')}</div>`:empty('没有匹配的学者'))+externalSearch(state.q);}
  if(state.view==='works') {const list=matchingWorks();html=heading('论文与项目',`${list.length} 项匹配工作 · 可组合方向、学者、类型和关键词筛选。`)+filters(true)+(list.length?`<div class="work-list">${list.map(workCard).join('')}</div>`:empty('没有匹配的工作'))+externalSearch(state.q);}
  if(state.view==='map') html=mapView();
  if(state.view==='saved') {const ps=matchingPeople().filter(p=>prefs.saved.includes('p:'+p.id)),ws=matchingWorks().filter(w=>prefs.saved.includes('w:'+w.id));html=heading('我的收藏',`${ps.length} 位学者 · ${ws.length} 项工作。笔记可在详情中编辑；请定期导出备份。`)+filters()+(!ps.length&&!ws.length?empty('还没有匹配的收藏'): (ps.length?heading('收藏学者')+`<div class="grid">${ps.map(personCard).join('')}</div>`:'')+(ws.length?heading('收藏工作')+`<div class="work-list">${ws.map(workCard).join('')}</div>`:''));html+='<div class="links"><button class="chip" data-backup>导出收藏与笔记</button><button class="chip" data-restore>导入备份</button></div>';}
  $('#content').innerHTML=((state.view==='people'||state.view==='overview')&&typeof trackingMarkup==='function'?trackingMarkup():'')+html;
}
let activeDetail=null;
function dialogOpen() {if(!$('#detail').open)$('#detail').showModal();}
function noteArea(id) {return `<h3>我的研究笔记</h3><textarea class="note" data-note="${id}" aria-label="我的研究笔记" placeholder="记录感兴趣的问题、阅读进度或下一步线索…">${e(prefs.notes[id]||'')}</textarea><div class="note-status">${storageOK?'输入后自动保存在当前浏览器。导出备份可以迁移记录。':'浏览器存储不可用，请使用导出备份保存记录。'}</div>`;}
function showPerson(id) {
  const p=person(id);if(!p)return;activeDetail={kind:'p',id};const own=ownWorks(id);
  const related=DB.people.filter(other=>other.id!==id&&other.topics.some(t=>p.topics.includes(t)));
  $('#detail-body').innerHTML=`<div class="detail-header"><button class="close" data-close aria-label="关闭详情">×</button>${scholarPortrait(p.id,p.name)}<div class="eyebrow">RESEARCHER PROFILE</div><h2>${e(p.name)}<small>${e(p.en)}</small></h2><p>${e(p.org)} · ${e(p.role)}</p><p>${e(p.summary)}</p><div class="links">${extLink(p.source,'人物与研究来源')}<button class="chip" data-save="p:${id}">${prefs.saved.includes('p:'+id)?'★ 已收藏':'☆ 收藏学者'}</button><button class="chip" data-allworks="${id}">筛选此学者全部工作 →</button><button class="chip" data-copy="person=${id}">复制本地直达链接</button></div></div><div class="detail-content"><h3>主要研究问题</h3><ul>${p.research.map(s=>`<li>${e(s)}</li>`).join('')}</ul>${tags(p.tags)}<h3>相关工作 <span class="type">${own.length} 项精选</span></h3>${own.map(workCard).join('')}<div class="evidence">资料说明：${e(p.note)} 核验日期：${DB.updated}。</div><h3>截图中的报告</h3><p>${e(p.talk)}</p>${p.image?`<details><summary>展开原始报告截图</summary><img class="screenshot" src="assets/talk-${p.image}.jpg" alt="${e(p.name)}报告截图" loading="lazy"></details>`:""}<h3>主题相关的其他学者</h3><div class="related">${related.map(p=>`<button data-person="${p.id}">${e(p.name)} →</button>`).join('')}</div><p class="note-status">按研究主题关联，不表示合作关系。</p>${externalSearch(p.name+' '+p.org.split(' · ')[0])}${noteArea('p:'+id)}</div>`;dialogOpen();$('#detail').scrollTop=0;
}
function showWork(id) {
  const w=DB.works.find(w=>w.id===id);if(!w)return;activeDetail={kind:'w',id};const p=person(w.person);
  $('#detail-body').innerHTML=`<div class="detail-header"><button class="close" data-close aria-label="关闭详情">×</button><div class="eyebrow">RESEARCH / ${e(w.type)}</div><h2 style="font-size:21px">${e(w.title)}</h2><p>${e(w.status)} · ${w.year||'持续更新'}</p></div><div class="detail-content"><h3>研究内容</h3><p>${e(w.summary)}</p>${tags(w.tags)}<h3>关联研究者</h3><div class="related"><button data-person="${p.id}">${e(p.name)} · ${e(p.org)} →</button></div><div class="evidence ${w.caution?'caution':''}">证据与归属：${e(w.evidence)}<br>核验日期：${DB.updated}。</div><div class="links">${w.url?extLink(w.url,'原文 / 项目来源'):''}${w.source?extLink(w.source,'补充来源'):''}${w.code?extLink(w.code,'代码'):''}${w.data?extLink(w.data,'数据集'):''}<button class="chip" data-save="w:${id}">${prefs.saved.includes('w:'+id)?'★ 已收藏':'☆ 收藏工作'}</button><button class="chip" data-copy="work=${id}">复制本地直达链接</button></div>${w.id==='netcanvas'?`<details><summary>查看报告截图</summary><img class="screenshot" src="assets/talk-6.jpg" alt="NetCanvas 架构与验证效果截图"></details>`:''}${noteArea('w:'+id)}</div>`;dialogOpen();$('#detail').scrollTop=0;
}
function exportBackup() {const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),...prefs},null,2)],{type:'application/json'}));a.href=url;a.download='知研-收藏笔记-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('备份已导出');}
async function importBackup(file) {if(!file)return;try {if(file.size>2000000) throw Error('备份文件过大');const incoming=validateBackup(JSON.parse(await file.text()));prefs.saved=[...new Set([...prefs.saved,...incoming.saved])];for(const [id,note] of Object.entries(incoming.notes)){const existing=prefs.notes[id];prefs.notes[id]=existing&&existing!==note?existing+'\n\n—— 导入笔记 ——\n'+note:note;}const ok=persist();render();if(ok)toast('导入完成，已合并收藏与笔记');}catch(err){toast('导入失败：'+err.message);}$('#import-file').value='';}
document.addEventListener('click',async ev=>{
  const target=ev.target.closest('[data-person],[data-work],[data-save],[data-query],[data-topic],[data-reset],[data-close],[data-allworks],[data-backup],[data-restore],[data-copy]');if(!target)return;
  if(target.hasAttribute('data-person'))showPerson(target.dataset.person);
  else if(target.hasAttribute('data-work'))showWork(target.dataset.work);
  else if(target.hasAttribute('data-save')) {const id=target.dataset.save;const has=prefs.saved.includes(id);prefs.saved=has?prefs.saved.filter(v=>v!==id):[...prefs.saved,id];persist();render();if($('#detail').open&&activeDetail){if(activeDetail.kind==='p')showPerson(activeDetail.id);else showWork(activeDetail.id);}toast(has?'已取消收藏':'已收藏');}
  else if(target.hasAttribute('data-query')){$('#detail').close();navigate('overview',{q:target.dataset.query,topic:'',who:'',kind:''});}
  else if(target.hasAttribute('data-topic')){$('#detail').close();navigate(state.view==='works'?'works':'people',{topic:target.dataset.topic,who:'',kind:''});}
  else if(target.hasAttribute('data-reset'))navigate(state.view,{q:'',topic:'',who:'',kind:''});
  else if(target.hasAttribute('data-close'))$('#detail').close();
  else if(target.hasAttribute('data-allworks')){$('#detail').close();navigate('works',{q:'',topic:'',who:target.dataset.allworks,kind:''});}
  else if(target.hasAttribute('data-backup'))exportBackup();
  else if(target.hasAttribute('data-restore'))$('#import-file').click();
  else if(target.hasAttribute('data-copy')) {const link=location.href.split('#')[0]+'#people?'+target.dataset.copy;try {await navigator.clipboard.writeText(link);toast('直达链接已复制');}catch{toast('此浏览器无法复制，可从地址栏复制本地网站地址');}}
});
document.addEventListener('input',ev=>{if(ev.target.matches('[data-note]')){prefs.notes[ev.target.dataset.note]=ev.target.value;const ok=persist();const status=ev.target.nextElementSibling;status.textContent=ok?'已自动保存 · 当前浏览器':'未能持久保存，请导出备份';}});
document.addEventListener('change',ev=>{const key={'person-filter':'who','type-filter':'kind',sort:'sort'}[ev.target.id];if(key)navigate(state.view,{[key]:ev.target.value});});
document.addEventListener('keydown',ev=>{if(ev.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)&&!$('#detail').open){ev.preventDefault();$('#search').focus();}if(ev.key==='Enter'&&ev.target.matches('g[role="button"]'))ev.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
$('#search-form').addEventListener('submit',ev=>{ev.preventDefault();navigate(state.view==='map'||state.view==='saved'?'overview':state.view,{q:$('#search').value.trim()});});
$('#search').addEventListener('input',()=>{clearTimeout(state.searchTimer);state.searchTimer=setTimeout(()=>{const view=state.view==='map'?'overview':state.view;navigate(view,{q:$('#search').value.trim()});},220);});
$('#backup').onclick=exportBackup;$('#restore').onclick=()=>$('#import-file').click();$('#import-file').onchange=ev=>importBackup(ev.target.files[0]);
$('#detail').addEventListener('click',ev=>{if(ev.target===$('#detail')){const r=$('#detail').getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)$('#detail').close();}});
$('#side-topics').innerHTML=DB.topics.map(t=>`<button class="side-topic" data-topic="${t.id}" style="--tone:${t.color}"><i class="dot"></i>${e(t.name)}</button>`).join('');
window.addEventListener('hashchange',readRoute);readRoute();
