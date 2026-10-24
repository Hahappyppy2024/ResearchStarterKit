import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyCompletion,weeklyCompletion} from './daily-completion.mjs';
const base=[{id:'a',title:'Task A',start:60,end:120},{id:'b',title:'Task B',start:120,end:180}];
test('missing history is unknown and future dates are not failures',()=>{const days=weeklyCompletion(base,{},'2026-10-23','2026-10-23');assert.equal(days[0].date,'2026-10-19');assert.equal(days[0].status,'unknown');assert.equal(days[6].status,'future');});
test('split scheduled tasks count once and subtasks count independently',()=>{const state={todos:[{id:'todo-one',title:'Inserted',start:80,end:100}],done:['a','b','todo-one'],subtasks:{a:[{id:'sub-one',title:'Child',done:false}]}};assert.deepEqual(dailyCompletion(base,state),{total:4,done:3,status:'partial'});state.subtasks.a[0].done=true;assert.equal(dailyCompletion(base,state).status,'complete');});
test('hidden tasks are excluded and zero tasks never earns a completed cat',()=>{assert.deepEqual(dailyCompletion(base,{hiddenSchedule:['a','b']}),{done:0,total:0,status:'empty'});assert.equal(dailyCompletion(base,{done:[]}).status,'incomplete');});
