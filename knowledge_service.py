"""Bilingual topic/problem definitions, paper annotations and paper revision quizzes."""
import datetime,json,re,uuid
import study_service as study
RELATIONS={'same-problem','builds-on','improves','extends','uses-component','baseline','compares','complements','applies','supports','challenges','background','surveys','uncertain'}
TRANSLATIONS={'软件工程':'Software Engineering','AIGC':'AI Generated Content','自动驾驶':'Autonomous Driving','多模态':'Multimodal Learning','Agent / LLM':'Agents / Large Language Models','持续维护与评测':'Continuous Maintenance and Evaluation','仓库级 Agent':'Repository-level Agents','代码生成':'Code Generation','程序修复与代码建模':'Program Repair and Code Modeling','统一与音视频生成':'Unified Audio and Video Generation','Transformer 与流':'Transformers and Flows','扩散与潜空间':'Diffusion and Latent Spaces','生成模型基础':'Generative Model Foundations','实时推理':'Real-time Inference','检索与未来表征':'Retrieval and Future Representations','VLA 与世界模型':'Vision-Language-Action and World Models','BEV 与规划':'Bird’s-eye View and Planning','端到端驾驶基础':'End-to-end Driving Foundations','交错推理与决策':'Interleaved Reasoning and Decision Making','全模态模型':'Omni-modal Models','视觉指令学习':'Visual Instruction Learning','视觉语言对齐':'Vision-Language Alignment','Agentic RL 系统':'Agentic Reinforcement Learning Systems','强化学习与对齐':'Reinforcement Learning and Alignment','记忆与自演化':'Memory and Self-evolution','推理与工具':'Reasoning and Tools','语言模型基础':'Language Model Foundations'}
STATUSES={'unverified','author-claim','checked','inference'}
def row(c,kind,ident):return study.row(c,kind,ident)
def put(c,kind,obj):c.execute('INSERT INTO records VALUES(?,?,?,0) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body',(kind,obj['id'],json.dumps(obj,ensure_ascii=False)))
def row_exists(c,kind,ident):return c.execute('SELECT 1 FROM records WHERE kind=? AND id=?',(kind,ident)).fetchone()

def nodes(c):return study.records(c,'taxonomy')
def taxonomy():
 with study.connection() as c:
  if not c.execute("SELECT 1 FROM records WHERE kind='knowledge-meta' AND id='taxonomy-v1'").fetchone():
   import lineage_service
   # Read seed files directly so the initialization does not nest a database transaction.
   try:topics=json.loads((study.ATLAS/'topics.json').read_text(encoding='utf-8-sig'))
   except (OSError,ValueError):topics=[]
   for t in topics:
    root=dict(id='tax-'+t['id'],kind='topic',name=t['name'],en=t.get('en',''),definition=t.get('description',''),parentId=None,revision=1,lineageId='topic-'+t['id'])
    put(c,'taxonomy',root)
    branches=list(dict.fromkeys(t.get('branches',[])))
    for i,name in enumerate(branches):put(c,'taxonomy',dict(id='tax-'+t['id']+'-'+str(i),kind='topic',name=name,en='',definition='',parentId=root['id'],revision=1))
   put(c,'knowledge-meta',dict(id='taxonomy-v1'))
  if not row_exists(c,'knowledge-meta','taxonomy-bilingual-v2'):
   for n in nodes(c):
    if n['revision']==1 and n['name'] in TRANSLATIONS:n['en']=TRANSLATIONS[n['name']];put(c,'taxonomy',n)
   put(c,'knowledge-meta',dict(id='taxonomy-bilingual-v2'))
  return dict(nodes=nodes(c))
def ancestors(ident,items):
 index={n['id']:n for n in items};result=[];seen=set()
 while ident:
  if ident in seen or ident not in index:raise ValueError('分类层级无效')
  seen.add(ident);n=index[ident];result.insert(0,n);ident=n.get('parentId')
 return result
def save_node(data):
 taxonomy()
 with study.connection() as c:
  items=nodes(c);obj=row(c,'taxonomy',data['id']) if data.get('id') else dict(id=str(uuid.uuid4()),revision=0)
  if data.get('id') and obj['revision']!=data.get('revision'):raise ValueError('定义已更新，请重新打开后编辑')
  kind=data.get('kind',obj.get('kind'))
  if obj.get('kind') and kind!=obj['kind'] and any(n.get('parentId')==obj['id'] for n in items):raise ValueError('有子分类时不能更改 Topic / Problem 类型')
  parent=data.get('parentId') or None
  if kind not in ('topic','problem'):raise ValueError('请选择 Topic 或 Problem')
  name=study.text(data.get('name',''),160);en=study.text(data.get('en',''),200)
  if not name or not en:raise ValueError('请填写中文名称和英文名称')
  chain=ancestors(parent,items) if parent else []
  if any(n['id']==obj['id'] for n in chain):raise ValueError('分类不能形成循环')
  if any(n['kind']!=kind for n in chain):raise ValueError('Topic 与 Problem 分别维护层级')
  if len(chain)>=3:raise ValueError('当前支持大类、子类、子子类三级')
  # A move must preserve the depth of every existing descendant as well.
  for n in items:
   path=ancestors(n['id'],items)
   if obj['id'] in [p['id'] for p in path] and len(chain)+len(path)-[p['id'] for p in path].index(obj['id'])>3:raise ValueError('移动后子分类将超过三级')
  if any(n['id']!=obj['id'] and n['kind']==kind and n.get('parentId')==parent and (n['name'].casefold()==name.casefold() or n.get('en','').casefold()==en.casefold()) for n in items):raise ValueError('同一层级已有同名分类，请直接选择或编辑已有定义')
  obj.update(kind=kind,name=name,en=en,parentId=parent,definition=study.text(data.get('definition','')),revision=obj['revision']+1,updatedAt=study.now())
  put(c,'taxonomy',obj)
  mapid=obj.get('lineageId','taxonomy-'+obj['id']);existing=c.execute("SELECT body FROM records WHERE kind='lineage' AND id=?",(mapid,)).fetchone()
  if existing:
   m=json.loads(existing[0]);m.update(name=name+' · '+en,description=obj['definition'],revision=m['revision']+1);put(c,'lineage',m)
  return obj
def get_paper(ident):
 taxonomy()
 with study.connection() as c:
  r=c.execute("SELECT body FROM records WHERE kind='paper-knowledge' AND id=?",(ident,)).fetchone()
  return json.loads(r[0]) if r else dict(id=ident,revision=0,topicIds=[],problemIds=[],tasks={},ownedMaps=[])
def save_paper(data):
 pid=study.text(data.get('paperId',''),200);paper=study.resolve('paper',pid);taxonomy()
 with study.connection() as c:
  r=c.execute("SELECT body FROM records WHERE kind='paper-knowledge' AND id=?",(pid,)).fetchone()
  old=json.loads(r[0]) if r else dict(id=pid,revision=0,ownedMaps=[])
  if data.get('revision',0)!=old['revision']:raise ValueError('这篇论文已在另一窗口更新。草稿仍在当前浏览器，请刷新后核对。')
  allnodes=nodes(c);index={n['id']:n for n in allnodes};obj={**old};selected=[]
  for key,kind in [('topicIds','topic'),('problemIds','problem')]:
   ids=data.get(key,old.get(key,[]))
   if not isinstance(ids,list) or len(ids)>50:raise ValueError('每篇最多选择 50 个分类')
   obj[key]=list(dict.fromkeys(ids))
   for ident in obj[key]:
    if ident not in index or index[ident]['kind']!=kind:raise ValueError('选择的分类不存在')
    selected.extend(ancestors(ident,allnodes))
  tasks=data.get('tasks',old.get('tasks',{}))
  if not isinstance(tasks,dict):raise ValueError('阅读任务格式无效')
  definitions=json.loads((study.ROOT/'web'/'paper-task-definitions.json').read_text(encoding='utf-8'))
  clean={}
  for task in definitions:
   value=tasks.get(task['id'],{});entry=dict(done=value.get('done') is True,answer=study.text(value.get('answer',''),20000))
   if task['id']=='categories':entry['tags']=[study.text(t,80) for t in value.get('tags',[]) if isinstance(t,str)][:100]
   if task['id']=='connections':
    refs=value.get('references',[])
    if not isinstance(refs,list) or len(refs)>200:raise ValueError('关联论文最多 200 条')
    entry['references']=[]
    for ref in refs:
     target=study.text(ref.get('paperId',''),200)
     if target==pid:raise ValueError('不能把论文关联到自身')
     if target:study.resolve('paper',target)
     types=ref.get('relationTypes',[])
     if not isinstance(types,list) or any(t not in RELATIONS for t in types):raise ValueError('论文关系类型无效')
     entry['references'].append(dict(id=study.text(ref.get('id',''),100),paperId=target,paper=study.text(ref.get('paper',''),1000),relation=study.text(ref.get('relation',''),10000),relationTypes=list(dict.fromkeys(types)),evidenceStatus=ref.get('evidenceStatus') if ref.get('evidenceStatus') in STATUSES else 'unverified',evidence=study.text(ref.get('evidence',''),10000)))
   clean[task['id']]=entry
  obj.update(tasks=clean,title=paper['title'],revision=old['revision']+1,updatedAt=study.now())
  if data.get('read') and not obj.get('readDate'):
   read_date=study.valid_date(data.get('readDate') or study.today())
   if read_date>study.today():raise ValueError('已读日期不能晚于今天')
   obj['readDate']=read_date
  wanted={n.get('lineageId','taxonomy-'+n['id']):n for n in selected};owned=set(old.get('ownedMaps',[]))
  for mapid in owned-set(wanted):
   m=row(c,'lineage',mapid);m['paperIds']=[i for i in m['paperIds'] if i!=pid];m['paths']=[{**p,'ids':[i for i in p['ids'] if i!=pid]} for p in m['paths'] if any(i!=pid for i in p['ids'])];m['revision']+=1;put(c,'lineage',m)
  newowned=owned&set(wanted)
  for mapid,n in wanted.items():
   r=c.execute("SELECT body FROM records WHERE kind='lineage' AND id=?",(mapid,)).fetchone()
   m=json.loads(r[0]) if r else dict(id=mapid,kind=n['kind'],name=n['name']+(' · '+n['en'] if n.get('en') else ''),description=n.get('definition',''),paperIds=[],paths=[],revision=0,createdAt=study.now())
   if pid not in m['paperIds']:m['paperIds'].append(pid);newowned.add(mapid);m['revision']+=1;put(c,'lineage',m)
  obj['ownedMaps']=sorted(newowned);put(c,'paper-knowledge',obj);return obj
def edges(paperids):
 with study.connection() as c:
  result=[]
  for obj in study.records(c,'paper-knowledge'):
   for ref in obj.get('tasks',{}).get('connections',{}).get('references',[]):
    if ref.get('paperId') and (not paperids or obj['id'] in paperids or ref['paperId'] in paperids):result.append(dict(source=obj['id'],sourceTitle=obj['title'],target=ref['paperId'],targetTitle=ref['paper'],types=ref['relationTypes'],evidence=ref['evidence'],status=ref['evidenceStatus']))
  return result
def week(date):
 d=datetime.date.fromisoformat(study.valid_date(date));return (d-datetime.timedelta(days=d.weekday())).isoformat()
def paper_week(date=None):
 date=date or study.today();monday=week(date);end=(datetime.date.fromisoformat(monday)+datetime.timedelta(days=6)).isoformat()
 with study.connection() as c:
  cards=[]
  for obj in study.records(c,'paper-knowledge'):
   if not monday<=obj.get('readDate','')<=min(date,end):continue
   for task in json.loads((study.ROOT/'web'/'paper-task-definitions.json').read_text(encoding='utf-8')):
    answer=obj.get('tasks',{}).get(task['id'],{})
    if not answer.get('done') or not answer.get('answer'):continue
    ident=obj['id']+':'+task['id'];snapshot_key=monday+':'+ident
    snap=c.execute("SELECT body FROM records WHERE kind='paper-quiz-snapshot' AND id=?",(snapshot_key,)).fetchone()
    reference=json.loads(snap[0]) if snap else dict(id=snapshot_key,question=task['title'],reference=answer['answer'])
    if not snap:put(c,'paper-quiz-snapshot',reference)
    saved=c.execute("SELECT body FROM records WHERE kind='paper-quiz' AND id=?",(monday+':'+ident,)).fetchone();attempt=json.loads(saved[0]) if saved else {}
    cards.append(dict(id=ident,paperId=obj['id'],title=obj['title'],question=reference['question'],reference=reference['reference'],revision=attempt.get('revision',0),studentAnswer=attempt.get('studentAnswer',''),verdict=attempt.get('verdict','unanswered')))
  return dict(week=monday,end=end,cards=cards,papers=len({c['paperId'] for c in cards}))
def paper_attempt(data):
 monday=week(data.get('date',study.today()));ident=study.text(data.get('id',''),300);answer=study.text(data.get('studentAnswer',''),30000)
 if not answer:raise ValueError('请先填写自己的答案')
 if data.get('verdict') not in ('submitted','known','review'):raise ValueError('请选择对照笔记或自评结果')
 if not any(c['id']==ident for c in paper_week(data.get('date',study.today()))['cards']):raise ValueError('题目不在本周阅读复习范围')
 with study.connection() as c:
  key=monday+':'+ident;r=c.execute("SELECT body FROM records WHERE kind='paper-quiz' AND id=?",(key,)).fetchone();old=json.loads(r[0]) if r else dict(revision=0)
  if old['revision']!=data.get('revision',0):raise ValueError('作答记录已更新，请刷新')
  obj=dict(id=key,studentAnswer=answer,verdict=data['verdict'],revision=old['revision']+1,updatedAt=study.now());put(c,'paper-quiz',obj);return obj
