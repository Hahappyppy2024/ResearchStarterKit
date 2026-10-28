import assert from 'node:assert/strict';
import {plannedTasks,currentTask} from './todos.mjs';

const base=[{id:'slides',title:'Slides',start:810,end:960},{id:'research',title:'Research',start:960,end:1080}];
const website={id:'todo-website',title:'Website',start:900,end:930};
const ranges=tasks=>tasks.map(({id,start,end})=>[id,start,end]);
assert.deepEqual(ranges(plannedTasks(base,[website])),[
  ['slides',810,900],['todo-website',900,930],['slides',930,960],['research',960,1080]
]);
const nested={id:'todo-other',title:'Other',start:910,end:920};
const tasks=plannedTasks(base,[website,nested]);
assert.deepEqual(ranges(tasks).slice(1,4),[['todo-website',900,910],['todo-other',910,920],['todo-website',920,930]]);
assert.equal(currentTask(tasks,915).id,'todo-other');
assert.equal(currentTask(tasks,930).id,'slides');
assert.deepEqual(ranges(plannedTasks(base,[])),ranges(base));
assert.deepEqual(ranges(plannedTasks(base,[{...website,start:930,end:990}])),[
  ['slides',810,930],['todo-website',930,990],['research',990,1080]
]);
assert.deepEqual(ranges(plannedTasks(base,[{...website,start:810,end:1080}])),[['todo-website',810,1080]]);
assert.equal(plannedTasks(base,[website])[0].sourceEnd,960);
assert.equal(base[0].end,960);
console.log('Schedule splitting checks passed.');
