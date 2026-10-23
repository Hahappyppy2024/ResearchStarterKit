"""Bilingual paper titles only; never translates notes or abstracts."""
import contextlib,hashlib,re,threading
import study_service as study
import topic_library as library
LOCK=threading.Lock()

def bilingual_title(data):
 pid=study.text(data.get('paperId',''),200)
 p=study.resolve('paper',pid)
 title=p.get('title','').strip()
 if not title:raise ValueError('论文标题为空')
 zh=p.get('titleZh','').strip();en=p.get('titleEn','').strip()
 chinese=bool(re.search(r'[\u4e00-\u9fff]',title))
 if chinese:zh=zh or title
 else:en=en or title
 result=dict(paperId=pid,title=title,titleZh=zh,titleEn=en,provider='原始题录')
 with LOCK:
  try:
   if not zh:result['titleZh']=library.translate_text(en)
   if not en:result['titleEn']=translate_english(zh)
   if not zh or not en:result['provider']='机器翻译，请对照原文核对'
  except Exception as e:
   limited=getattr(getattr(e,'response',None),'status_code',None)==429
   result['error']='在线翻译限流或额度已用完，原始标题已保留' if limited else '标题翻译暂不可用，原始标题已保留'
 return result

def translate_english(text):
 import requests
 key=hashlib.sha256(('zh-en:'+text).encode()).hexdigest()
 with contextlib.closing(library.reader_service.connection()) as c:
  row=c.execute('SELECT zh FROM translations WHERE hash=?',(key,)).fetchone()
 if row:return row[0]
 r=requests.get('https://translate.googleapis.com/translate_a/single',params={'client':'gtx','sl':'zh-CN','tl':'en','dt':'t','q':text},timeout=12)
 r.raise_for_status();value=''.join(x[0] for x in r.json()[0] if x and x[0])
 if not value.strip():raise ValueError('没有英文译名')
 with contextlib.closing(library.reader_service.connection()) as c:
  c.execute('INSERT OR REPLACE INTO translations VALUES(?,?,?,?)',(key,text,value,'Google zh-en'));c.commit()
 return value
