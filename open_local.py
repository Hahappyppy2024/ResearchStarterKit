"""Launch local research, literature, and poetry services, then open the selected site."""
import pathlib,subprocess,sys,time,urllib.request,webbrowser
root=pathlib.Path(__file__).resolve().parent
port=8768 if "--poetry" in sys.argv else 8767 if "--literature" in sys.argv else 8766
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def ready(number):
 try:
  with opener.open(f"http://127.0.0.1:{number}/",timeout=2) as r:return r.status==200
 except Exception:return False
startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
for number,flag in [(8766,[]),(8767,["--literature"]),(8768,["--poetry"])]:
 if ready(number):continue
 with open(root/"data"/f"server-{number}.log","ab") as out,open(root/"data"/f"server-{number}-error.log","ab") as err:
  subprocess.Popen([sys.executable,str(root/"local_app.py"),"serve","--port",str(number)]+flag,cwd=root,stdout=out,stderr=err,startupinfo=startup,creationflags=subprocess.CREATE_NO_WINDOW)
for _ in range(20):
 if ready(port):break
 time.sleep(.5)
webbrowser.open(f"http://127.0.0.1:{port}/")
