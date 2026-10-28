import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nestTodo,restoreNestedTodo,moveSubtask} from './timeline-nesting.mjs';
import {cleanSubtasks} from './todos.mjs';
test('dragging to an existing task moves the Todo into its subtasks without losing source data',()=>{
 const todo={id:'todo-one',title:'Read paper',start:null,end:null,detail:'Keep my evidence',paper:{id:'p',title:'Paper'}},children=[{id:'sub-old',title:'Evidence',done:true}],state={todos:[todo],done:['todo-one'],notes:'Keep day notes',subtasks:{'todo-one':children}};
 const nested=nestTodo(state,'parent','todo-one','sub-new');assert.equal(nested.todos.length,0);assert.equal(nested.subtasks.parent.length,2);assert.equal(nested.subtasks.parent[0].paper.id,'p');assert.equal(nested.notes,'Keep day notes');
 const cleaned=cleanSubtasks([{id:'parent'}],[],nested.subtasks);assert.equal(cleaned.parent[0].sourceTodoId,'todo-one');
 const restored=restoreNestedTodo({...nested,subtasks:cleaned},'todo-one');assert.deepEqual(restored.todos,state.todos);assert.deepEqual(restored.subtasks['todo-one'],children);assert.deepEqual(restored.done,state.done);
});
test('cannot drop a task into itself; restoring carries over edits made while nested',()=>{const state={todos:[{id:'todo-one',title:'Original',start:600,end:660}],done:[],subtasks:{}};assert.equal(nestTodo(state,'todo-one','todo-one','sub-one'),state);const nested=nestTodo(state,'parent','todo-one','sub-one');nested.subtasks.parent[0].title='Updated';nested.subtasks.parent[0].done=true;const restored=restoreNestedTodo(nested,'todo-one');assert.equal(restored.todos[0].title,'Updated');assert.ok(restored.done.includes('todo-one'));assert.equal(restored.todos[0].start,600);});
test('moving a nested subtree to another root preserves paper, detail and descendants and blocks cycles',()=>{
 const state={todos:[],subtasks:{a:[{id:'sub-a',title:'Paper',paper:{id:'p',title:'Title'},detail:'Evidence'},{id:'sub-b',title:'Method',parentSubtaskId:'sub-a'}],b:[{id:'sub-c',title:'Related work'}]}};
 assert.equal(moveSubtask(state,'a','sub-a','a','sub-b'),state);
 assert.equal(moveSubtask(state,'a','sub-a','a','sub-a'),state);
 const moved=moveSubtask(state,'a','sub-a','b','sub-c');assert.equal(moved.subtasks.a.length,0);assert.equal(moved.subtasks.b[1].parentSubtaskId,'sub-c');assert.equal(moved.subtasks.b[1].paper.id,'p');assert.equal(moved.subtasks.b[1].detail,'Evidence');assert.equal(moved.subtasks.b[2].parentSubtaskId,'sub-a');
 const clean=cleanSubtasks([{id:'a'},{id:'b'}],[],moved.subtasks);assert.equal(clean.b[2].parentSubtaskId,'sub-a');
});
test('a paper dropped into a child can move across roots and restore with its current descendants',()=>{
 const todo={id:'todo-paper',title:'Paper',start:null,end:null,paper:{id:'p',title:'Full paper title'}},state={todos:[todo],done:[],subtasks:{a:[{id:'sub-target',title:'Related work'}],b:[{id:'sub-other',title:'Other'}],'todo-paper':[{id:'sub-note',title:'Read methods'}]}};
 const nested=nestTodo(state,'a',todo.id,'sub-paper','sub-target');assert.equal(nested.subtasks.a[1].parentSubtaskId,'sub-target');assert.equal(nested.subtasks.a[2].parentSubtaskId,'sub-paper');
 const moved=moveSubtask(nested,'a','sub-paper','b','sub-other'),restored=restoreNestedTodo(moved,todo.id);assert.deepEqual(restored.todos,[todo]);assert.deepEqual(restored.subtasks['todo-paper'],state.subtasks['todo-paper']);assert.equal(restored.subtasks.b.length,1);
});
test('cleanup makes orphan and cyclic parent links reachable instead of hiding tasks',()=>{const clean=cleanSubtasks([{id:'a'}],[],{a:[{id:'sub-a',title:'A',parentSubtaskId:'sub-b'},{id:'sub-b',title:'B',parentSubtaskId:'sub-a'},{id:'sub-c',title:'C',parentSubtaskId:'sub-missing'}]});assert.equal(clean.a.length,3);assert.equal(clean.a[0].parentSubtaskId,undefined);assert.equal(clean.a[2].parentSubtaskId,undefined);});
