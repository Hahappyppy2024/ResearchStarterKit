import {mountPdf} from './paper-pdf-viewer.js';
import {openReader} from './paper-reader.js';
const $=id=>document.getElementById(id),id=new URLSearchParams(location.search).get('id');
const slider=$('paper-pane-width');slider.oninput=()=>document.documentElement.style.setProperty('--paper-left-width',slider.value+'%');
let source='',loading=false;
async function loadOriginal(){if(loading||!id)return;loading=true;$('paper-pdf-retry').disabled=true;$('paper-pdf-status').hidden=false;$('paper-pdf-status').textContent='正在加载官方 PDF，首次打开会缓存到本机……';try{const r=await fetch('/api/study/paper-original?'+new URLSearchParams({paperId:id}),{cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error||'原文加载失败');$('paper-original-frame').hidden=false;await mountPdf(data.url,$('paper-original-frame')); $('paper-pdf-status').textContent='原文已加载 · 可独立滚动、缩放；笔记与阅读进度按这篇论文保存。';}catch(e){$('paper-pdf-status').textContent=e.message;}finally{loading=false;$('paper-pdf-retry').disabled=false;}}
$('paper-pdf-retry').onclick=loadOriginal;
if(id){const ready=openReader(id,'tasks'),reader=document.querySelector('.paper-reader');if(reader)$('paper-workbench-notes').append(reader);const paper=await ready;if(paper){document.title=paper.title+' · 阅读工作台';source=paper.pdf||'';if(/^https?:\/\//.test(source)){$('paper-source-link').href=source;$('paper-source-link').hidden=false;}loadOriginal();}}else{$('paper-pdf-status').textContent='请从论文卡片打开阅读工作台。';}
