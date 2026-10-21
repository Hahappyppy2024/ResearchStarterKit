import pathlib,subprocess,sys,time,urllib.request,webbrowser
root=pathlib.Path(__file__).resolve().parent;url="http://127.0.0.1:8769/"
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def ready():
 try:
  with opener.open(url,timeout=2) as response:return response.status==200
 except Exception:return False
if not ready():
 startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
 with open(root/"data"/"hub-server.log","ab") as out,open(root/"data"/"hub-server-error.log","ab") as err:
  subprocess.Popen([sys.executable,str(root/"hub_server.py")],cwd=root,stdout=out,stderr=err,startupinfo=startup,creationflags=subprocess.CREATE_NO_WINDOW)
 for _ in range(20):
  if ready():break
  time.sleep(.5)
try:
 request=urllib.request.Request(url+"api/services/start",data=b"{}",headers={"Content-Type":"application/json"})
 opener.open(request,timeout=3).close()
except Exception:pass
webbrowser.open(url)
