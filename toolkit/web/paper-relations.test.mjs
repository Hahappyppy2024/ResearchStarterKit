import assert from 'node:assert/strict';
import {cleanPaperTasks} from './paper-tasks.mjs';
import {PAPER_RELATIONS,cleanRelationTypes} from './paper-relations.mjs';
assert.equal(PAPER_RELATIONS.length,14);
assert.deepEqual(cleanRelationTypes(['improves','baseline','improves','fake']),['improves','baseline']);
const input={connections:{done:true,answer:'Original response',references:[{id:'ref-1',paper:'Earlier work',relation:'My original detailed explanation',evidence:'Introduction, paragraph 2',relationTypes:['builds-on','improves','invalid'],evidenceStatus:'author-claim'}]}};
const clean=cleanPaperTasks(input);assert.equal(clean.connections.done,true);assert.equal(clean.connections.answer,'Original response');assert.equal(clean.connections.references[0].relation,'My original detailed explanation');assert.deepEqual(clean.connections.references[0].relationTypes,['builds-on','improves']);assert.equal(clean.connections.references[0].evidenceStatus,'author-claim');
const old=cleanPaperTasks({connections:{references:[{id:'ref-old',paper:'Original paper',relation:'Do not lose this note'}]}}).connections.references[0];assert.equal(old.relation,'Do not lose this note');assert.deepEqual(old.relationTypes,[]);assert.equal(old.evidenceStatus,'unverified');console.log('Relation choices, multiple labels, evidence status and legacy notes preserved');
