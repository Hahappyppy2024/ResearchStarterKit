"""Start only the six known local research services, preserving their original origins."""
import concurrent.futures,pathlib,subprocess,sys,threading,urllib.request
ROOT=pathlib.Path(__file__).resolve().parent
NODE="C:/nvm4w/nodejs/node.exe"
SERVICES=[
 {"id":"projects","name":"项目实验本","port":8770,"cwd":str(ROOT),"command":[sys.executable,str(ROOT/"projects_server.py")]},
 {"id":"daily","name":"每日努力","port":8766,"cwd":str(ROOT),"command":[sys.executable,str(ROOT/"local_app.py"),"serve","--port","8766"]},
 {"id":"atlas","name":"论文脉络","port":4173,"cwd":"D:/000_CV_projects/Top_projects/research-atlas","command":[NODE,"scripts/local.mjs"]},
 {"id":"scholars","name":"学者研究导航","port":8791,"cwd":"D:/000_CV_projects/Top_projects/scholar-navigator","command":[NODE,"server.cjs"]},
 {"id":"library","name":"会议文献库","port":8767,"cwd":str(ROOT),"command":[sys.executable,str(ROOT/"local_app.py"),"serve","--port","8767","--literature"]},
 {"id":"poetry","name":"毛主席诗词","port":8768,"cwd":str(ROOT),"command":[sys.executable,str(ROOT/"local_app.py"),"serve","--port","8768","--poetry"]}]
LOCK=threading.Lock();ERRORS={}
def check(service):
 url=f"http://127.0.0.1:{service['port']}/"
 try:
  with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(url,timeout=2) as r:ready=r.status==200
 except Exception:ready=False
 return {"id":service["id"],"name":service["name"],"url":url,"ready":ready,"error":ERRORS.get(service["id"])}
def status():
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:return list(pool.map(check,SERVICES))
def ensure_services():
 if not LOCK.acquire(blocking=False):return
 try:
  for service in SERVICES:
   if check(service)["ready"]:continue
   try:
    if not pathlib.Path(service["cwd"]).is_dir():raise FileNotFoundError("网站目录不存在")
    startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
    with open(ROOT/"data"/("hub-"+service["id"]+".log"),"ab") as log:
     subprocess.Popen(service["command"],cwd=service["cwd"],stdout=log,stderr=log,startupinfo=startup,creationflags=subprocess.CREATE_NO_WINDOW)
    ERRORS.pop(service["id"],None)
   except Exception as e:ERRORS[service["id"]]=str(e)
 finally:LOCK.release()
