import {test} from 'node:test';
import assert from 'node:assert/strict';
import {returnScheduledTask,returnSubtask} from './timeline-return.mjs';
import {nestTodo} from './timeline-nesting.mjs';
import {cleanTodos,cleanSubtasks,plannedTasks,scheduledBase} from './todos.mjs';
import {todoDuration} from './timeline-model.mjs';

test('returning a scheduled paper clears its slot without losing identity, duration, notes, completion or descendants',()=>{
 const task={id:'todo-paper',title:'Paper',start:600,end:625,paper:{id:'p',title:'Paper',url:'https://example.org/paper.pdf'},detail:'Keep evidence'},children=[{id:'sub-one',title:'Read methods',done:true}],state={todos:[task],done:[task.id],notes:'Day notes',subtasks:{[task.id]:children},timelineOrder:[task.id]};
 const next=returnScheduledTask(state,{...task,custom:true},'todo-unused'),roundtrip=cleanTodos(next.todos)[0];assert.equal(next.todos.length,1);assert.equal(roundtrip.id,task.id);assert.equal(roundtrip.start,null);assert.equal(roundtrip.end,null);assert.equal(todoDuration(roundtrip),25);assert.deepEqual(roundtrip.paper,task.paper);assert.equal(roundtrip.detail,task.detail);assert.deepEqual(next.subtasks[task.id],children);assert.deepEqual(next.done,state.done);assert.equal(next.notes,state.notes);assert.equal(plannedTasks([],next.todos).length,0);
});
test('a default parent moves once into Todo together with its entire subtree and remains hidden until deliberately restored',()=>{
 const base=[{id:'papers',title:'Read papers',start:480,end:660,detail:'Keep'}],state={todos:[],done:['papers'],subtasks:{papers:[{id:'sub-one',title:'Paper',done:false}]}};
 const next=returnScheduledTask(state,base[0],'todo-parent');assert.equal(scheduledBase(base,next).length,0);assert.equal(cleanTodos(next.todos)[0].sourceScheduleId,'papers');assert.equal(todoDuration(next.todos[0]),180);assert.deepEqual(next.done,['todo-parent']);assert.equal(cleanSubtasks(base,next.todos,next.subtasks)['todo-parent'].length,1);assert.equal(next.subtasks.papers,undefined);assert.equal(returnScheduledTask(next,base[0],'todo-duplicate'),next);
});
test('dragging a split parent back preserves its full original interval as the estimated duration',()=>{const next=returnScheduledTask({todos:[],done:[]},{id:'papers',title:'Read papers',start:500,end:530,sourceStart:480,sourceEnd:660},'todo-parent');assert.equal(next.todos[0].durationMinutes,180);});
test('returning an archived nested Todo preserves edits, tracked time and child hierarchy, and always unschedules it',()=>{
 const original={id:'todo-paper',title:'Paper',start:600,end:610,paper:{id:'p',title:'Full title',url:'https://example.org/paper.pdf'},detail:'Old note'},state=nestTodo({todos:[original],done:[],subtasks:{'todo-paper':[{id:'sub-child',title:'Evidence',done:true}]}},'papers','todo-paper','sub-parent');
 state.subtasks.papers[0]={...state.subtasks.papers[0],detail:'Updated evidence',durationMinutes:35,spentMinutes:35,done:true};
 const next=returnSubtask(state,'papers','sub-parent','todo-unused'),todo=cleanTodos(next.todos)[0];assert.equal(todo.id,original.id);assert.equal(todo.start,null);assert.equal(todo.detail,'Updated evidence');assert.equal(todo.spentMinutes,35);assert.equal(todoDuration(todo),35);assert.deepEqual(todo.paper,original.paper);assert.equal(next.subtasks.papers.length,0);assert.equal(next.subtasks[todo.id][0].parentSubtaskId,undefined);assert.ok(next.done.includes(todo.id));assert.equal(next.nestedTodoArchive[original.id],undefined);
});
test('an independently created subtask can become a Todo, carrying grandchildren and project associations',()=>{
 const item={id:'sub-one',title:'Analysis',detail:'Details',done:false,projectTask:{projectId:'p',taskId:'t',projectName:'Project'},durationMinutes:20},state={todos:[],subtasks:{papers:[item,{id:'sub-two',title:'Check result',parentSubtaskId:'sub-one',done:true},{id:'sub-three',title:'Keep here',done:false}]}};
 const next=returnSubtask(state,'papers','sub-one','todo-new');assert.equal(next.todos[0].id,'todo-new');assert.deepEqual(next.todos[0].projectTask,item.projectTask);assert.equal(next.subtasks.papers[0].id,'sub-three');assert.equal(next.subtasks['todo-new'][0].id,'sub-two');assert.equal(returnSubtask(next,'papers','sub-one','todo-other'),next);
});
