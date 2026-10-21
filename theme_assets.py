"""Shared local theme assets and the user's persistent palette choice."""
import json,pathlib,threading
ROOT=pathlib.Path(__file__).resolve().parent
ASSETS=ROOT/'web-shared'
SETTING=ROOT/'local-data'/'appearance.json'
LOCK=threading.Lock()
ORIGINS={f'http://127.0.0.1:{p}' for p in (8766,8767,8768,8769,8770,8791,4173,8772)}|{'http://localhost:8769'}
def inject(body,kind):
 if 'text/html' not in kind:return body
 markup=b'<link rel="stylesheet" href="/research-theme.css"><script defer src="/research-theme.js"></script>'
 return body.replace(b'</head>',markup+b'</head>',1) if b'research-theme.js' not in body else body
def asset(path):
 names={'/research-theme.js':('theme.js','application/javascript'),'/research-theme.css':('theme.css','text/css')}
 if path not in names:return None
 name,kind=names[path];return (ASSETS/name).read_bytes(),kind
def preference():
 try:data=json.loads(SETTING.read_text(encoding='utf-8'));theme=data.get('theme','green')
 except (OSError,ValueError):theme='green'
 return dict(theme=theme if theme in ('green','blue') else 'green')
def save(data):
 theme=data.get('theme')
 if theme not in ('green','blue'):raise ValueError('请选择绿色或蓝色')
 with LOCK:
  SETTING.parent.mkdir(parents=True,exist_ok=True);tmp=SETTING.with_suffix('.tmp');tmp.write_text(json.dumps(dict(theme=theme)),encoding='utf-8');tmp.replace(SETTING)
 return dict(theme=theme)
