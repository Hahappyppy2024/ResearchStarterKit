"""Isolated study-workspace UI QA; no user catalog, notes or grades are changed."""
import pathlib,http.server,json
import local_app,reader_service,study_service,research_practice,weekly_arxiv
root=local_app.ROOT/'local-data'/'study-ui-qa';root.mkdir(exist_ok=True)
with local_app.db() as c:papers=[json.loads(r[0]) for r in c.execute('SELECT body FROM papers ORDER BY title LIMIT 5')]
local_app.DATA=root;local_app.absorb(papers)
reader_service.ROOT=root.parent/'study-ui-qa-reader';(reader_service.ROOT/'local-data').mkdir(exist_ok=True,parents=True)
# Readers share the isolated QA catalog only; own notes database.
reader_service.paper=lambda ident:study_service.resolve('paper',ident)
study_service.DB=root/'study.sqlite';research_practice.DB=root/'practice.sqlite';weekly_arxiv.DB=root/'weekly.sqlite'
local_app.PORT=8772;local_app.WEB=local_app.ROOT/'web'
http.server.ThreadingHTTPServer(('127.0.0.1',8772),local_app.Handler).serve_forever()
