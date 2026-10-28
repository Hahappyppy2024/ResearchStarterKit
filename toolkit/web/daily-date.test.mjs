import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceDailyDate,unscheduledPeriod} from './daily-date.mjs';
import {chinaTime,schedule} from './schedule.mjs';
import {plannedTasks,scheduledBase} from './todos.mjs';

test('the Beijing date changes at midnight regardless of the host timezone',()=>{
 assert.equal(chinaTime(new Date('2026-10-23T15:59:59Z')).date,'2026-10-23');
 assert.equal(chinaTime(new Date('2026-10-23T16:00:00Z')).date,'2026-10-24');
});
test('midnight advances today and re-enables automatic following',()=>{
 const result=advanceDailyDate({selected:'2026-10-23',lastToday:'2026-10-23',followToday:true},'2026-10-24');
 assert.equal(result.selected,'2026-10-24');assert.equal(result.lastToday,'2026-10-24');assert.equal(result.changed,true);assert.equal(result.followToday,true);
});
test('history remains selected within the same day; it does not pin the next day to yesterday',()=>{
 const state={selected:'2026-10-20',lastToday:'2026-10-23',followToday:false};
 assert.equal(advanceDailyDate(state,'2026-10-23').selected,'2026-10-20');
 assert.equal(advanceDailyDate(state,'2026-10-24').selected,'2026-10-24');
});
test('returning after sleep or a hidden hub panel skips directly to the current day',()=>{
 const result=advanceDailyDate({selected:'2026-10-23',lastToday:'2026-10-23',followToday:true},'2026-10-27');
 assert.equal(result.selected,'2026-10-27');assert.equal(result.changed,true);
});
test('a draft, dialog or drag defers switching until it is finished without consuming the rollover',()=>{
 const state={selected:'2026-10-23',lastToday:'2026-10-23',followToday:true},pending=advanceDailyDate(state,'2026-10-24',true);
 assert.equal(pending.selected,'2026-10-23');assert.equal(pending.lastToday,'2026-10-23');assert.equal(pending.pending,true);assert.equal(pending.changed,false);
 const saved=advanceDailyDate(pending,'2026-10-24',false);assert.equal(saved.selected,'2026-10-24');assert.equal(saved.pending,false);assert.equal(saved.changed,true);
 assert.equal(advanceDailyDate(saved,'2026-10-24').changed,false);
});
test('switching dates does not copy yesterday overrides, todos, notes or completion',()=>{
 const days={'2026-10-23':{scheduleOverrides:{papers:{title:'Yesterday custom reading',start:500,end:530,detail:'Yesterday'}},done:['papers'],notes:'Keep yesterday',todos:[{id:'todo-old',title:'Yesterday task',start:600,end:610}],subtasks:{papers:[{id:'sub-old',title:'Yesterday child',done:true}]}}},before=JSON.stringify(days);
 const result=advanceDailyDate({selected:'2026-10-23',lastToday:'2026-10-23',followToday:true},'2026-10-24'),today=days[result.selected]||{},tasks=plannedTasks(scheduledBase(schedule,today),today.todos);
 assert.equal(tasks.find(t=>t.id==='papers').title,'阅读最新论文');assert.equal(tasks.some(t=>t.id==='todo-old'),false);assert.equal(today.done,undefined);assert.equal(today.notes,undefined);assert.equal(today.subtasks,undefined);assert.equal(JSON.stringify(days),before);
});
test('the early morning gap is not mislabeled as last night or tomorrow',()=>{const result=unscheduledPeriod(schedule,415);assert.equal(result.title,'当前时段未安排任务');assert.equal(result.start,360);assert.equal(result.end,420);assert.ok(result.detail.includes('喂猫'));assert.equal(result.detail.includes('明天'),false);});
test('night labels distinguish today after midnight from tomorrow before midnight',()=>{assert.equal(unscheduledPeriod(schedule,15).title,'夜间休息');assert.ok(unscheduledPeriod(schedule,15).detail.includes('今天'));assert.ok(unscheduledPeriod(schedule,1400).title.includes('明天'));});
