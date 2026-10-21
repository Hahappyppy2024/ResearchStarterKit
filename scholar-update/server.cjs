// Local preview; binds only to this computer. No packages required.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {execFile} = require('node:child_process');
const root = __dirname;
const tracker = require('./tracker.cjs');
const port = Number(process.env.ZHIYAN_PORT || 8791);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const url = `http://127.0.0.1:${port}`;
const server = http.createServer((req,res)=>{
  let pathname;
  try {pathname=decodeURIComponent(new URL(req.url,url).pathname);} catch {res.writeHead(400);res.end('Bad request');return;}
  if(pathname.startsWith('/api/')){void tracker.handle(req,res,pathname);return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!['.html','.css','.js','.jpg'].includes(path.extname(file))){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data);});
});
function openBrowser(){if(process.platform==='win32')execFile('rundll32.exe',['url.dll,FileProtocolHandler',url]);}
server.on('error',err=>{if(err.code==='EADDRINUSE') {http.get(url,r=>{let body='';r.on('data',v=>body+=v);r.on('end',()=>{if(body.includes('知研')){console.log('Existing local site: '+url);if(process.argv.includes('--open'))openBrowser();}else {console.error('Port occupied. Set ZHIYAN_PORT to a different port.');process.exitCode=1;}});}).on('error',()=>{process.exitCode=1;});}else {console.error(err);process.exitCode=1;}});
server.listen(port,'127.0.0.1',()=>{console.log('Local: '+url);console.log('Press Ctrl+C to stop.');if(process.argv.includes('--open'))openBrowser();});

setTimeout(()=>tracker.refresh().catch(console.error),3000).unref();
setInterval(()=>tracker.refresh().catch(console.error),3600000).unref();
