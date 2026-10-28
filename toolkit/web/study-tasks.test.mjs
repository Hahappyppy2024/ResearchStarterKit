import assert from 'node:assert/strict';
import {PAPER_TASKS,cleanPaperTasks} from './paper-tasks.mjs';
import {cleanTodos,plannedTasks} from './todos.mjs';
import {readFileSync} from 'node:fs';
const tasks=JSON.parse(readFileSync(new URL('./paper-task-definitions.json',import.meta.url),'utf8'));
assert.deepEqual(PAPER_TASKS,tasks);assert.equal(PAPER_TASKS.length,21);
const original=['problem','solution','why','limitations','improvements','extensions','related','affiliations','categories'];
assert.equal(PAPER_TASKS[0].id,'methodology');assert.equal(PAPER_TASKS.at(-1).id,'flashcards');assert.deepEqual(PAPER_TASKS.filter(t=>original.includes(t.id)).map(t=>t.id),original);for(const id of ['connections','focus','taxonomy'])assert.ok(!PAPER_TASKS.some(t=>t.id===id));assert.ok(PAPER_TASKS.some(t=>t.id==='reading-questions'));
const clean=cleanPaperTasks({problem:{done:true,answer:'My original notes'},connections:{references:[{id:'ref-a',paper:'A',relation:'Builds on',evidence:'Intro'}]}});assert.equal(clean.problem.answer,'My original notes');assert.equal(clean.problem.done,true);assert.equal(clean.connections.references[0].relation,'Builds on');assert.equal(clean.reproduce.done,false);
const todo={id:'todo-study-123',title:'Understand code',start:null,end:null,studyTask:{paperId:'manual-abc',taskId:'code-map'},detail:'Deliver a data flow'};assert.deepEqual(cleanTodos([todo])[0].studyTask,todo.studyTask);assert.equal(cleanTodos([todo])[0].paper,undefined);
const scheduled=plannedTasks([],[{...todo,start:600,end:630}]);assert.deepEqual(scheduled[0].studyTask,todo.studyTask);console.log('Study tasks: original answers, optional tasks and scheduling metadata passed');

const research=cleanPaperTasks({compare:{answer:"My comparison",comparisonPaperIds:["manual-baseline"]},"next-step":{answer:"My plan",problems:[{id:"problem-id",name:"新问题",en:"New problem",keywords:["few-shot","remote sensing"]}]}});assert.deepEqual(research.compare.comparisonPaperIds,["manual-baseline"]);assert.equal(research.compare.answer,"My comparison");assert.deepEqual(research["next-step"].problems[0].keywords,["few-shot","remote sensing"]);assert.equal(research["next-step"].answer,"My plan");

const questions=cleanPaperTasks({"reading-questions":{items:[{id:"item-q1",question:"Why this loss?",answer:"My explanation"},{id:"item-q2",question:"How does it fail?",answer:""}]},extensions:{answer:"Legacy paragraph",items:[{id:"item-e1",question:"New domain, same problem?"}]},focus:{answer:"Preserved hidden note"}});assert.equal(questions["reading-questions"].items[0].answer,"My explanation");assert.equal(questions.extensions.items.length,1);assert.equal(questions.extensions.answer,"Legacy paragraph");assert.equal(questions.focus.answer,"Preserved hidden note");
