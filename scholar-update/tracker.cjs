'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const file=path.join(__dirname,'data','scholar-tracking.json');
let state={scholars:[]}, running=false;
if(fs.existsSync(file)){state=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(state.scholars))throw Error('Invalid scholar database');}
function save(){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(state,null,2));fs.renameSync(temp,file);}
function text(v,max=500){return String(v||'').trim().slice(0,max);}
function upsert(body){
  const name=text(body.name,120), author=text(body.author,120);
  if(!name||!author||!/[A-Za-z]/.test(author)||/["\n\r]/.test(author))throw Error('请填写姓名及完整英文论文署名（不能含引号或换行）');
  let record=state.scholars.find(s=>s.id===body.id);
  if(body.id&&!record)throw Error('学者不存在');
  if(state.scholars.some(s=>s.id!==body.id&&s.author.toLowerCase()===author.toLowerCase()))throw Error('这个英文署名已在追踪，请编辑现有学者');
  if(record&&record.author!==author){record.papers=[];record.lastChecked=null;record.lastAttempt=null;record.error='';}
  if(!record){record={id:crypto.randomUUID(),papers:[],createdAt:new Date().toISOString()};state.scholars.push(record);}
  Object.assign(record,{name,author,org:text(body.org),research:text(body.research,2000),source:text(body.source,1000),personId:text(body.personId,80),topic:['science','agents','theory','infra'].includes(body.topic)?body.topic:'agents',paused:body.paused===true});save();return record;
}
function fetchPapers(author){return new Promise((resolve,reject)=>execFile(process.env.ZHIYAN_PYTHON||(fs.existsSync('D:/language/python311/python.exe')?'D:/language/python311/python.exe':'python'),[path.join(__dirname,'arxiv_fetch.py'),author],{timeout:45000,maxBuffer:4000000,windowsHide:true,encoding:'utf8'},(err,out)=>{if(err)return reject(Error('arXiv 请求失败或超时，请稍后重试'));try{resolve(JSON.parse(out));}catch{reject(Error('arXiv 返回格式无法读取'));}}));}
async function refreshOne(s){
  const author=s.author;s.lastAttempt=new Date().toISOString();
  try{const incoming=await fetchPapers(author);if(s.author!==author)return;const baseline=!s.lastChecked, old=new Map(s.papers.map(p=>[p.id,p]));
    for(const p of incoming){const previous=old.get(p.id);old.set(p.id,{...p,firstSeen:previous?.firstSeen||new Date().toISOString(),isNew:previous?previous.isNew:!baseline,read:previous?.read||false});}
    s.papers=[...old.values()].sort((a,b)=>b.published.localeCompare(a.published));s.lastChecked=new Date().toISOString();s.error='';
  }catch(err){s.error=err.message;}save();
}
async function refresh(id,force=false){
  if(running)return {busy:true};running=true;
  try{const records=state.scholars.filter(s=>(!id||s.id===id)&&!s.paused);for(const s of records){if(!force&&s.lastAttempt&&Date.now()-Date.parse(s.lastAttempt)<12*3600000)continue;await refreshOne(s);if(records.length>1)await new Promise(r=>setTimeout(r,3100));}return {busy:false};}finally{running=false;}
}
async function handle(req,res,pathname){
  const reply=(code,v)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(v));};
  if(req.headers.host!=='127.0.0.1:'+res.socket.localPort)return reply(403,{error:'仅允许本机访问'});
  if(req.method==='GET'&&pathname==='/api/tracking')return reply(200,{...state,running});
  if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
  if(req.headers.origin!=='http://127.0.0.1:'+res.socket.localPort||!req.headers['content-type']?.startsWith('application/json'))return reply(403,{error:'请求来源不受支持'});
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>50000)throw Error('请求过大');}body=JSON.parse(body);
    if(pathname==='/api/scholar')return reply(200,{scholar:upsert(body)});
    if(pathname==='/api/tracking/refresh'){const id=text(body.id);if(id&&!state.scholars.some(s=>s.id===id))throw Error('学者不存在');void refresh(id,true);return reply(202,{running:true});}
    if(pathname==='/api/tracking/read'){const s=state.scholars.find(s=>s.id===body.id),p=s?.papers.find(p=>p.id===body.paperId);if(!p)throw Error('论文不存在');p.read=body.read===true;if(p.read)p.isNew=false;save();return reply(200,{ok:true});}
    return reply(404,{error:'接口不存在'});
  }catch(err){reply(400,{error:err.message});}
}
module.exports={handle,refresh,upsert,state};
