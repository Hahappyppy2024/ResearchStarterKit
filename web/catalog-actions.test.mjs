import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paperPdfUrl,appendPaperTodo,togglePaperTodo} from './catalog-actions.mjs';
test('PDF links select the actual PDF and avoid unsafe or unknown source links',()=>{
 assert.equal(paperPdfUrl({pdf:'https://example.org/original.pdf',source:'https://arxiv.org/abs/2610.12345'}),'https://example.org/original.pdf');
 assert.equal(paperPdfUrl({source:'https://arxiv.org/abs/2610.12345'}),'https://arxiv.org/pdf/2610.12345');
 assert.equal(paperPdfUrl({source:'https://openaccess.thecvf.com/content/CVPR2026/html/Example.html'}),'https://openaccess.thecvf.com/content/CVPR2026/papers/Example.pdf');
 assert.equal(paperPdfUrl({pdf:'javascript:alert(1)',source:'https://example.org/landing'}),'');
});
test('adding a paper to Today Todo preserves other days, notes and completion without duplicate insertion',()=>{
 const db={notifications:true,days:{'2026-10-22':{notes:'keep yesterday'},'2026-10-23':{notes:'keep today',done:['existing'],todos:[{id:'todo-old',title:'Existing',start:null,end:null}]}}};
 const original=structuredClone(db),paper={id:'arxiv-2610.12345',title:'A paper',source:'https://arxiv.org/abs/2610.12345'};
 const result=appendPaperTodo(db,paper,'2026-10-23','todo-new');
 assert.equal(result.added,true);assert.deepEqual(db,original);assert.equal(result.database.days['2026-10-23'].todos.length,2);
 assert.deepEqual(result.database.days['2026-10-23'].done,['existing']);assert.equal(result.database.days['2026-10-23'].notes,'keep today');assert.deepEqual(result.database.days['2026-10-22'],db.days['2026-10-22']);
 assert.equal(appendPaperTodo(result.database,paper,'2026-10-23','todo-duplicate').added,false);
});
test('malformed Todo storage is rejected without overwriting it',()=>{
 for(const db of [{days:[]},{days:{'2026-10-23':{todos:'invalid'}}}])assert.throws(()=>appendPaperTodo(db,{id:'p',title:'Paper'},'2026-10-23','todo-new'));
});
test('Todo buttons toggle membership while preserving customized tasks for rejoining',()=>{
 const p={id:'p',title:'Paper'},day='2026-10-23',db={days:{[day]:{notes:'keep',todos:[{id:'todo-existing',paper:p,title:'My customized reading task',detail:'Keep my notes',start:600,end:660}],done:['todo-existing'],subtasks:{'todo-existing':[{id:'sub-one',title:'Evidence',done:true}]}}}};
 const removed=togglePaperTodo(db,p,day,'todo-new');assert.equal(removed.added,false);assert.equal(removed.database.days[day].todos.length,0);
 const restored=togglePaperTodo(removed.database,p,day,'todo-new');assert.equal(restored.added,true);assert.deepEqual(restored.database.days[day].todos,db.days[day].todos);assert.deepEqual(restored.database.days[day].subtasks,db.days[day].subtasks);assert.deepEqual(restored.database.days[day].done,db.days[day].done);
});

test('a nested paper counts as an existing Todo and toggles its subtree without duplicating it',()=>{const paper={id:'nested-paper',title:'Nested paper'},database={days:{'2026-10-23':{todos:[],subtasks:{reading:[{id:'sub-paper',title:'Nested paper',paper},{id:'sub-note',title:'Evidence',parentSubtaskId:'sub-paper'}]}}}};const removed=togglePaperTodo(database,paper,'2026-10-23','todo-unused');assert.equal(removed.added,false);assert.equal(removed.database.days['2026-10-23'].subtasks.reading.length,0);const restored=togglePaperTodo(removed.database,paper,'2026-10-23','todo-unused');assert.equal(restored.added,true);assert.equal(restored.database.days['2026-10-23'].todos.length,0);assert.deepEqual(restored.database.days['2026-10-23'].subtasks.reading,database.days['2026-10-23'].subtasks.reading);});
