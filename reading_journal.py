"""Completed-paper journal and user-written daily, weekly and monthly reviews."""
import datetime as dt,json
import study_service as study

def statistics(include_items=False):
 import local_app,contextlib
 with contextlib.closing(local_app.db()) as c:ids={r[0] for r in c.execute('SELECT id FROM papers')}
 ids.update(p['id'] for p in study.atlas_papers())
 with study.connection() as c:
  records=study.records(c,'paper-knowledge')
  selected={p['id'] for p in study.records(c,'paper')}
  selected.update(r[0] for r in c.execute('SELECT DISTINCT paper_id FROM queue'))
  selected.update(p['id'] for p in records)
 ids.intersection_update(selected)
 read={p['id'] for p in records if p['id'] in ids and p.get('readDate') and complete(p)}
 result=dict(total=len(ids),read=len(read),unread=len(ids-read))
 if include_items:
  byid={p['id']:p for p in records};items=[]
  for ident in ids:
   try:paper=study.resolve('paper',ident)
   except ValueError:continue
   tasks=byid.get(ident,{}).get('tasks',{})
   items.append(dict(id=ident,title=paper['title'],authors=paper.get('authors',''),read=ident in read,done=sum(tasks.get(t['id'],{}).get('done') is True for t in definitions()),taskTotal=len(definitions())))
  result['items']=sorted(items,key=lambda p:p['title'].lower())
 return result

def definitions():return json.loads((study.ROOT/'web'/'paper-task-definitions.json').read_text(encoding='utf-8'))
def complete(obj):return all(obj.get('tasks',{}).get(t['id'],{}).get('done') is True for t in definitions())

def library():
 with study.connection() as c:records=study.records(c,'paper-knowledge');logs=study.records(c,'reading-log')
 items=[]
 for obj in records:
  if not obj.get('readDate') or not complete(obj):continue
  try:paper=study.resolve('paper',obj['id'])
  except ValueError:continue
  tasks=obj.get('tasks',{})
  dates=sorted({obj['readDate'],*[r['date'] for r in logs if r['paperId']==obj['id']]})
  items.append(dict(id=obj['id'],title=paper['title'],authors=paper.get('authors',''),date=dates[-1],dates=dates,problem=tasks.get('problem',{}).get('answer',''),solution=tasks.get('solution',{}).get('answer',''),limitations=tasks.get('limitations',{}).get('answer',''),next=tasks.get('next-step',{}).get('answer','')))
 return dict(items=sorted(items,key=lambda p:(p['date'],p['title']),reverse=True))

def period(kind,date):
 d=dt.date.fromisoformat(study.valid_date(date))
 if kind=='day':start=end=d
 elif kind=='week':start=d-dt.timedelta(days=d.weekday());end=start+dt.timedelta(days=6)
 elif kind=='month':
  start=d.replace(day=1);end=(start.replace(year=start.year+1,month=1) if start.month==12 else start.replace(month=start.month+1))-dt.timedelta(days=1)
 else:raise ValueError('请选择每日、每周或每月综述')
 return start.isoformat(),end.isoformat()

def review(kind,date):
 start,end=period(kind,date);ident=kind+':'+start
 with study.connection() as c:
  found=c.execute("SELECT body FROM records WHERE kind='reading-review' AND id=?",(ident,)).fetchone()
 return json.loads(found[0]) if found else dict(id=ident,kind=kind,start=start,end=end,content='',revision=0)

def save_review(data):
 kind=data.get('kind');start,end=period(kind,data.get('date'));ident=kind+':'+start;content=study.text(data.get('content',''),100000)
 with study.connection() as c:
  found=c.execute("SELECT body FROM records WHERE kind='reading-review' AND id=?",(ident,)).fetchone();old=json.loads(found[0]) if found else dict(revision=0)
  if data.get('revision',0)!=old['revision']:raise ValueError('综述已在其他窗口更新，草稿保留，请刷新后核对')
  obj=dict(id=ident,kind=kind,start=start,end=end,content=content,revision=old['revision']+1,updatedAt=study.now())
  c.execute('INSERT INTO records VALUES(?,?,?,0) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body',('reading-review',ident,json.dumps(obj,ensure_ascii=False)))
 return obj
