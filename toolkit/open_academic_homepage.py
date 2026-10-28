"""Start the local academic homepage independently of Codex."""
import pathlib,subprocess,sys,time,urllib.request,webbrowser
site=pathlib.Path('D:/000_CV_projects/Top_projects/academic-homepage')
url='http://127.0.0.1:18765/'
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def ready():
 try:
  with opener.open(url,timeout=2) as r:return r.status==200 and b'assets/' in r.read()
 except Exception:return False
if not site.joinpath('index.html').is_file():raise SystemExit('Homepage files missing: '+str(site))
if not ready():
 logs=pathlib.Path(__file__).resolve().parent/'local-data';logs.mkdir(exist_ok=True)
 startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
 with open(logs/'academic-homepage.log','ab') as log:
  subprocess.Popen([sys.executable,'-m','http.server','18765','--bind','127.0.0.1','--directory',str(site)],cwd=site,stdout=log,stderr=log,stdin=subprocess.DEVNULL,startupinfo=startup,creationflags=subprocess.DETACHED_PROCESS|subprocess.CREATE_NEW_PROCESS_GROUP)
 for _ in range(30):
  if ready():break
  time.sleep(.3)
if not ready():raise SystemExit('Cannot start homepage. See research-local/local-data/academic-homepage.log')
print('Homepage ready: '+url)
if '--no-browser' not in sys.argv:webbrowser.open(url)
