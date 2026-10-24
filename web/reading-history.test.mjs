import {PAPER_TASKS} from './paper-tasks.mjs';
import assert from 'node:assert/strict';
import {readingStats,markPaperRead,cacheManualReading,isPaperRead,storedReadingStats,READING_STATE_KEY,READING_HISTORY_KEY} from './reading-history.mjs';
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
globalThis.window={dispatchEvent:()=>{}};globalThis.CustomEvent=class{constructor(type){this.type=type}};
const states={a:'read',b:'read',c:'read',d:'read',e:'unread',legacy:'read'};
const dates={a:'2026-10-21',b:'2026-10-19',c:'2026-10-18',d:'2026-09-30',e:'2026-10-21'};
assert.deepEqual(readingStats(states,dates,'2026-10-21'),{today:1,week:2,month:3,total:5,undated:1});
assert.equal(markPaperRead('same-paper',true),false);assert.equal(storedReadingStats().total,0);
store.set('paper-reading-tasks-v1:same-paper',JSON.stringify(Object.fromEntries(PAPER_TASKS.map(t=>[t.id,{done:true}]))));
markPaperRead('same-paper',true);const originalDate=JSON.parse(store.get(READING_HISTORY_KEY))['same-paper'];
markPaperRead('same-paper',true);assert.equal(storedReadingStats().total,1);assert.equal(JSON.parse(store.get(READING_HISTORY_KEY))['same-paper'],originalDate);
markPaperRead('same-paper',false);assert.equal(storedReadingStats().total,0);assert.equal(JSON.parse(store.get(READING_STATE_KEY))['same-paper'],'unread');
console.log('Shared reading statistics, deduplication and unmark checks passed.');

const unfinished=Object.fromEntries(PAPER_TASKS.map(t=>[t.id,{done:t.id!=='datasets'}]));store.set('paper-reading-tasks-v1:unfinished',JSON.stringify(unfinished));assert.equal(markPaperRead('unfinished',true),false);

cacheManualReading({id:'manual-paper',read:true,readDate:'2026-10-20',manual:true});
assert.equal(isPaperRead('manual-paper'),true);assert.equal(store.has('paper-reading-tasks-v1:manual-paper'),false);
markPaperRead('manual-paper',false);assert.equal(isPaperRead('manual-paper'),true);
cacheManualReading({id:'manual-paper',read:false,readDate:null,manual:true});assert.equal(isPaperRead('manual-paper'),false);
console.log('Explicit read marks remain independent of task completion.');

cacheManualReading({id:'server-completed',read:true,readDate:'2026-10-21',manual:false});assert.equal(isPaperRead('server-completed'),true);assert.equal(store.has('paper-reading-tasks-v1:server-completed'),false);
