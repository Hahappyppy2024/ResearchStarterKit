import assert from 'node:assert/strict';
import {mergeAutoCards} from './auto-card-merge.mjs';
const card=(id,answer)=>({id,question:id,answer});
const submitted={flashcards:{items:[card('a','old'),card('b','keep')]}};
const live={flashcards:{items:[card('a','edited while saving')]}};
mergeAutoCards(live,submitted,{flashcards:{items:[card('a','generated'),card('b','keep'),card('new','auto')]}});
assert.deepEqual(live.flashcards.items,[card('a','edited while saving'),card('new','auto')]);
const unchanged=structuredClone(submitted);mergeAutoCards(unchanged,submitted,{flashcards:{items:[card('a','updated')]}});assert.deepEqual(unchanged.flashcards.items,[card('a','updated')]);
console.log('Auto card merge: in-flight edits and removals preserved');
