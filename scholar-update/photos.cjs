const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../local-data/scholar-photos');
async function handle(req,res,pathname){
 const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.headers.host!=='127.0.0.1:'+res.socket.localPort)return reply(403,{error:'仅允许本机访问'});
 const id=pathname.slice('/api/scholar-photo/'.length);
 if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))return reply(400,{error:'学者编号无效'});
 const file=path.join(root,id+'.json');
 if(req.method==='GET'){try{return reply(200,fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{image:''});}catch{return reply(500,{error:'照片读取失败'});}}
 if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:'+res.socket.localPort||!req.headers['content-type']?.startsWith('application/json'))return reply(403,{error:'请求来源不受支持'});
 try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8000000)throw Error('照片不能超过 5MB');}const body=JSON.parse(raw);if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image))throw Error('请上传 JPG、PNG 或 WebP 照片');fs.mkdirSync(root,{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify({image:body.image,report:false}));fs.renameSync(temp,file);return reply(200,{ok:true});}catch(e){return reply(400,{error:e.message});}
}
module.exports={handle};
