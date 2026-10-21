const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let response=[],failure=false,writes=0;
const fakeFs={existsSync:()=>false,mkdirSync(){},writeFileSync(){writes++;},renameSync(){}};
const sandbox={require:n=>n==='node:fs'?fakeFs:n==='node:child_process'?{execFile:(bin,args,opts,cb)=>cb(failure?Error('offline'):null,JSON.stringify(response))}:require(n),module:{exports:{}},__dirname:__dirname,process,setTimeout};
vm.runInNewContext(fs.readFileSync(__dirname+'/tracker.cjs','utf8'),sandbox);
const tracker=sandbox.module.exports;
(async()=>{
 const s=tracker.upsert({name:'测试',author:'Test Author',org:'Test'});
 assert.throws(()=>tracker.upsert({name:'重复',author:'Test Author'}));
 response=[{id:'2601.00001',title:'Initial',published:'2026-01-01',updated:'2026-01-01'}];
 await tracker.refresh(s.id,true);assert.equal(s.papers[0].isNew,false);
 s.papers[0].read=true;
 response=[{...response[0],title:'Updated version'},{id:'2602.00002',title:'New paper',published:'2026-02-01',updated:'2026-02-01'}];
 await tracker.refresh(s.id,true);assert.equal(s.papers.length,2);assert.equal(s.papers[0].isNew,true);assert.equal(s.papers[1].read,true);
 failure=true;await tracker.refresh(s.id,true);assert.equal(s.papers.length,2);assert.ok(s.error);assert.ok(writes>0);
 tracker.upsert({...s,paused:true});assert.equal(s.paused,true);
 console.log('PASS: initial list, dedup/version update, new discovery, read preservation, failure retention, pause');
})().catch(err=>{console.error(err);process.exitCode=1;});
