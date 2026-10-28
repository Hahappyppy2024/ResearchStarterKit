"""Check the isolated public working tree without opening private databases."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
ALLOWED={'.gitignore','.gitattributes','.nojekyll','index.html','README.md','README_EN.md','sites','docs','scripts','toolkit','tests'}
FORBIDDEN={'local-data','local-data-backups','course-materials','courses-private','__pycache__','.env','node_modules'}
files=[p for p in ROOT.rglob('*') if p.is_file() and '.git' not in p.relative_to(ROOT).parts]
errors=[]
for p in files:
    rel=p.relative_to(ROOT)
    if rel.parts[0] not in ALLOWED:errors.append(f'Unexpected root: {rel}')
    if set(rel.parts)&FORBIDDEN or any(x in p.name.lower() for x in ('.sqlite','.db-wal','.db-shm')) or p.suffix.lower() in {'.db','.sqlite3','.ppt','.pptx','.pdf','.log','.pyc'}:errors.append(f'Private/runtime file: {rel}')
    if p.name in {'news_service.py','news.js','news.css','idea_service.py','research-ideas.js','research-ideas.css','create_learning_templates.ps1'}:errors.append(f'Excluded module: {rel}')
site=ROOT/'sites/mist-blue-lotus'
for p in site.rglob('*'):
    if not p.is_file() or p.suffix not in {'.js','.css','.html'}:continue
    text=p.read_text(encoding='utf-8')
    if re.search(r'127\.0\.0\.1|localhost|/api/|fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket',text):errors.append(f'Local/network dependency: {p.name}')
    for target in re.findall(r'(?:src|href)=["\']([^"\']+)["\']',text):
        if target.startswith(('#','http:','https:')):continue
        if not (p.parent/target).exists():errors.append(f'Missing asset: {target}')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(files)} public files; no database, course materials, local API, or private module found.')
