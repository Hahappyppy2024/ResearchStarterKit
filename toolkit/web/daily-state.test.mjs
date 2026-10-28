import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyState,resetDailyCompletion,undoDailyCompletionReset,restoreDailyTemplate,undoDailyTemplateRestore} from './daily-state.mjs';
import {dailyCompletion} from './daily-completion.mjs';
import {scheduledBase} from './todos.mjs';

const base=[
  {id:'morning',title:'Morning routine',start:420,end:480},
  {id:'papers',title:'Read papers',start:480,end:660}
];
const paper={id:'shared-paper',title:'A shared paper',url:'https://example.org/paper.pdf'};
test('reset survives refresh, leaves plans and history intact and supports undo after reload',()=>{
 const days={'2026-10-23':{done:['morning']},'2026-10-24':{done:['morning','todo-paper'],notes:'Keep notes',todos:[{id:'todo-paper',title:'Paper',start:480,end:490,paper}],scheduleOverrides:{morning:{title:'Routine',start:360,end:480}},subtasks:{papers:[{id:'sub-one',title:'Child paper',paper,done:true},{id:'sub-two',title:'Unfinished',done:false,parentSubtaskId:'sub-one'}]}}};
 const before=structuredClone(days),state=dailyState(base,days,'2026-10-24'),reset=resetDailyCompletion(state);
 assert.deepEqual(reset.done,[]);assert.deepEqual(reset.subtasks.papers.map(t=>t.done),[false,false]);
 assert.deepEqual(reset.todos,state.todos);assert.deepEqual(reset.scheduleOverrides,state.scheduleOverrides);assert.equal(reset.notes,state.notes);assert.deepEqual(days,before);
 const loaded=dailyState(base,JSON.parse(JSON.stringify({...days,'2026-10-24':reset})),'2026-10-24');
 assert.equal(dailyCompletion(base,loaded).done,0);assert.deepEqual(undoDailyCompletionReset(loaded),state);
 assert.equal(resetDailyCompletion(loaded),loaded);assert.deepEqual(days['2026-10-23'],before['2026-10-23']);
});
const todo=(id,title,extra={})=>({id,title,start:null,end:null,...extra});
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}

test('a new date has the default schedule without yesterday completion, plans or notes',()=>{
  const days=freeze({'2026-10-23':{
    notes:'Yesterday notes',done:['morning','todo-paper'],
    todos:[todo('todo-paper','A shared paper',{paper})],
    scheduleOverrides:{morning:{title:'Yesterday changed routine',start:450,end:480,detail:'Yesterday only'}},
    hiddenSchedule:['papers'],
    subtasks:{morning:[{id:'sub-paper',title:'Yesterday paper',paper,done:true}]}
  }});
  const original=structuredClone(days),today=dailyState(base,days,'2026-10-24');
  assert.deepEqual(today,{notes:'',todos:[],done:[],scheduleOverrides:{},hiddenSchedule:[],subtasks:{}});
  assert.deepEqual(scheduledBase(base,today),base);
  assert.deepEqual(dailyCompletion(base,today),{done:0,total:2,status:'incomplete'});
  assert.deepEqual(days,original);
  assert.equal(Object.hasOwn(days,'2026-10-24'),false);
});

test('ordinary, paper and nested completion are isolated even when two dates use the same ids',()=>{
  const days=freeze({
    '2026-10-23':{
      done:['morning','todo-paper'],
      todos:[todo('todo-paper','A shared paper',{paper}),todo('todo-ordinary','Ordinary task')],
      subtasks:{papers:[{id:'sub-parent',title:'Parent',done:true},{id:'sub-paper',title:'Nested paper',paper,parentSubtaskId:'sub-parent',done:true}]}
    },
    '2026-10-24':{
      done:['todo-ordinary'],
      todos:[todo('todo-paper','A shared paper',{paper}),todo('todo-ordinary','Ordinary task')],
      subtasks:{papers:[{id:'sub-parent',title:'Parent',done:false},{id:'sub-paper',title:'Nested paper',paper,parentSubtaskId:'sub-parent',done:false}]}
    }
  });
  const original=structuredClone(days),yesterday=dailyState(base,days,'2026-10-23'),today=dailyState(base,days,'2026-10-24');
  assert.deepEqual(yesterday.done,['morning','todo-paper']);
  assert.deepEqual(today.done,['todo-ordinary']);
  assert.equal(yesterday.subtasks.papers[1].done,true);
  assert.equal(today.subtasks.papers[1].done,false);
  assert.equal(today.subtasks.papers[1].parentSubtaskId,'sub-parent');
  assert.equal(dailyCompletion(base,yesterday).done,4);
  assert.equal(dailyCompletion(base,today).done,1);
  today.done.push('morning');today.subtasks.papers[1].done=true;
  assert.deepEqual(days,original);
  assert.equal(yesterday.subtasks.papers[1].done,true);
});

test('historical paper completion does not consult or overwrite global reading status',()=>{
  const days=freeze({'2026-10-23':{
    done:['todo-paper-done'],
    todos:[todo('todo-paper-done','Finished daily task',{paper}),todo('todo-paper-open','Unfinished daily task',{paper})],
    subtasks:{papers:[{id:'sub-finished',title:'Finished paper step',paper,done:true},{id:'sub-open',title:'Open paper step',paper,done:false}]}
  }});
  const original=structuredClone(days),descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Daily completion must not read global paper state');}});
  try{
    const historical=dailyState(base,days,'2026-10-23');
    assert.deepEqual(historical.done,['todo-paper-done']);
    assert.deepEqual(historical.subtasks.papers.map(item=>item.done),[true,false]);
    assert.deepEqual(days,original);
  }finally{
    if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;
  }
});

test('cleaning preserves saved completion and additional day fields without mutating the record',()=>{
  const days=freeze({'2026-10-23':{
    notes:123,done:['morning','morning','saved-legacy-task'],
    todos:[todo('todo-valid','  Valid task  '),{id:'invalid',title:'Invalid task'}],
    scheduleOverrides:{morning:{title:'  Custom routine  ',start:420,end:470,detail:'Keep'},unknown:{title:'Unknown',start:1,end:2}},
    hiddenSchedule:['papers','papers','unknown'],
    subtasks:{morning:[{id:'sub-valid',title:'  Valid child  ',done:true}],unknown:[{id:'sub-unknown',title:'Orphan',done:true}]},
    timelineOrder:['todo-valid','morning'],nestedTodoArchive:{keep:{todo:{id:'todo-archived'}}},customField:{keep:true}
  }});
  const original=structuredClone(days),state=dailyState(base,days,'2026-10-23');
  assert.equal(state.notes,'');assert.equal(state.todos.length,1);assert.equal(state.todos[0].title,'Valid task');
  assert.deepEqual(state.done,['morning','saved-legacy-task']);
  assert.deepEqual(state.hiddenSchedule,['papers']);
  assert.equal(state.scheduleOverrides.morning.title,'Custom routine');
  assert.equal(Object.hasOwn(state.scheduleOverrides,'unknown'),false);
  assert.deepEqual(state.subtasks,{morning:[{id:'sub-valid',title:'Valid child',done:true}]});
  assert.deepEqual(state.timelineOrder,['todo-valid','morning']);
  assert.deepEqual(state.nestedTodoArchive,original['2026-10-23'].nestedTodoArchive);
  assert.deepEqual(state.customField,{keep:true});
  assert.deepEqual(days,original);
});

test('template restoration has persistent undo and keeps completion, notes and Todo content',()=>{
 const state={scheduleOverrides:{morning:{title:'Custom',start:360,end:470}},hiddenSchedule:['papers'],timelineOrder:['morning'],done:['morning'],notes:'Evidence',todos:[{id:'todo-one',title:'Work',start:null,end:null}],subtasks:{morning:[{id:'sub-one',title:'Read',done:true}]}};
 const reset=restoreDailyTemplate(state);assert.deepEqual(reset.scheduleOverrides,{});assert.deepEqual(reset.hiddenSchedule,[]);assert.deepEqual(reset.done,state.done);assert.deepEqual(reset.todos,state.todos);assert.deepEqual(reset.subtasks,state.subtasks);assert.equal(reset.notes,state.notes);assert.deepEqual(undoDailyTemplateRestore(JSON.parse(JSON.stringify(reset))),state);
});
