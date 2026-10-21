import {chinaTime} from './schedule.mjs';
export const READING_STATE_KEY='daily-paper-reading-v1',READING_HISTORY_KEY='paper-read-dates-v1';
function readObject(key){try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
export function readingStats(states,history,date){
  const day=new Date(date+'T00:00:00Z'),weekday=(day.getUTCDay()+6)%7;
  day.setUTCDate(day.getUTCDate()-weekday);
  const monday=day.toISOString().slice(0,10),month=date.slice(0,7);
  const result={today:0,week:0,month:0,total:0,undated:0};
  for(const [id,state] of Object.entries(states)){
    if(state!=='read')continue;
    result.total++;
    const when=history[id];
    if(typeof when!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(when)){result.undated++;continue}
    if(when===date)result.today++;
    if(when>=monday&&when<=date)result.week++;
    if(when.startsWith(month)&&when<=date)result.month++;
  }
  return result;
}
export function storedReadingStats(){return readingStats(readObject(READING_STATE_KEY),readObject(READING_HISTORY_KEY),chinaTime().date)}
export function markPaperRead(id,read){
  const states=readObject(READING_STATE_KEY),history=readObject(READING_HISTORY_KEY);
  if(read&&states[id]!=='read')history[id]=chinaTime().date;
  states[id]=read?'read':'unread';
  localStorage.setItem(READING_HISTORY_KEY,JSON.stringify(history));
  localStorage.setItem(READING_STATE_KEY,JSON.stringify(states));
  window.dispatchEvent(new CustomEvent('paper-reading-status-change'));
}
export function renderReadingStats(){
  const stats=storedReadingStats();
  for(const key of ['today','week','month','total']){const el=document.getElementById('read-stat-'+key);if(el)el.textContent=stats[key]}
  const note=document.getElementById('reading-stats-note');
  if(note)note.textContent='同一论文去重统计 · 本周从周一开始'+(stats.undated?` · ${stats.undated} 篇历史已读无日期，仅计入累计`:'');
}

export function isPaperRead(id){return readObject(READING_STATE_KEY)[id]==='read'}
