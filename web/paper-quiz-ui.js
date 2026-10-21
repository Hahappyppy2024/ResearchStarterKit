import {knowledgeApi as api} from './paper-knowledge.js';
import {mountQuestionList} from './paper-research.js';
import {PAPER_TASKS} from './paper-tasks.mjs';
const choices=new Map();
function updateChoice(id,selection){const old=choices.get(id);if(old&&old.revision>selection.revision)return;choices.set(id,selection);for(const label of document.querySelectorAll('[data-paper-quiz]'))if(label.dataset.paperQuiz===id)label.querySelector('input').checked=selection.enabled}
export async function mountQuizToggle(host,paperId){
 const label=document.createElement('label'),check=document.createElement('input'),status=document.createElement('span');label.className='paper-daily-quiz-toggle';label.dataset.paperQuiz=paperId;check.type='checkbox';check.disabled=true;check.setAttribute('aria-label','这篇论文加入每日 Quiz');label.append(check,document.createTextNode(' 加入每日 Quiz '),status);host.append(label);let selection;
 try{selection=await api('paper-quiz-selection?paperId='+encodeURIComponent(paperId));updateChoice(paperId,selection);check.disabled=false}catch(e){status.textContent=e.message;return}
 check.onchange=async()=>{check.disabled=true;try{selection=await api('paper-quiz-selection',{paperId,revision:(choices.get(paperId)||selection).revision,enabled:check.checked});updateChoice(paperId,selection);status.textContent=selection.enabled?'已加入，使用此论文的 Flash Cards':'已移出每日 Quiz'}catch(e){check.checked=selection.enabled;status.textContent=e.message}finally{check.disabled=false}};
}
export function mountPaperFlashcards(host,paperId,state,all,save){
 const view=mountQuestionList(host,state,save,true,'Flash Card'),tools=document.createElement('div'),generate=document.createElement('button'),refresh=document.createElement('button'),status=document.createElement('p'),hint=document.createElement('p');let links={};
 hint.className='small muted';hint.textContent='填写任一阅读任务的回答后，会自动拆成简短问答卡片。问题使用简短模板，答案按原笔记句子或条目拆分，不补写结论；手动修改或移除的自动卡片会保留你的选择。';host.prepend(hint);
 generate.type=refresh.type='button';generate.className=refresh.className='button';generate.textContent='立即整理已有回答';refresh.textContent='刷新卡片显示';tools.append(generate,refresh,status);host.append(tools);mountQuizToggle(tools,paperId);
 function sources(){const cards=host.querySelectorAll('.paper-reference-card');for(const [i,item] of state.items.entries()){const card=cards[i];if(!card)continue;card.querySelector('.auto-card-source')?.remove();const link=links[item.id];if(!link)continue;const label=document.createElement('p');label.className='small muted auto-card-source';const key=link.source.split(':')[0],taskKey=({relation:'related',dataset:'datasets','dataset-name':'datasets',classification:'categories'}[key])||key;label.textContent='来源：'+(PAPER_TASKS.find(t=>t.id===taskKey)?.title||key)+(link.manual?' · 已手动编辑，保留你的版本':' · 自动生成');const source=document.createElement('button');source.type='button';source.className='button';source.textContent='查看来源任务';source.onclick=()=>document.getElementById('reader-task-'+taskKey)?.scrollIntoView({block:'start',behavior:'smooth'});label.append(' ',source);card.prepend(label)}}
 function updated(detail){links=detail.links||links;if(!host.isConnected)return;status.textContent='已保存 '+state.items.length+' 张卡片。'+(detail.overflow?'已达100张上限，另有 '+detail.overflow+' 个要点未生成。':'');if(!host.contains(document.activeElement)){view.draw();sources()}else status.textContent+=' 编辑结束后可点击“刷新卡片显示”。'}
 const onUpdated=e=>{if(!host.isConnected){window.removeEventListener('paper-flashcards-updated',onUpdated);return}if(e.detail.id===paperId)updated(e.detail)};window.addEventListener('paper-flashcards-updated',onUpdated);
 api('paper-knowledge?id='+encodeURIComponent(paperId)).then(record=>updated({links:record.autoFlashcardLinks,overflow:record.autoFlashcardOverflow})).catch(e=>status.textContent=e.message);
 generate.onclick=()=>{save();status.textContent='正在根据已保存回答自动整理…'};refresh.onclick=()=>{view.draw();sources()};
}
