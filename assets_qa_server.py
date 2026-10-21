"""Isolated UI validation for image uploads and dataset links."""
import http.server,pathlib,json
import local_app,study_service,reader_service
import learning_service
learning_service.DB=local_app.ROOT/'local-data'/'learning-qa.sqlite'
learning_service.FILES=local_app.ROOT/'local-data'/'learning-qa-files'
root=local_app.ROOT/'local-data'/'assets-ui-qa';root.mkdir(exist_ok=True,parents=True)
local_app.DATA=root;study_service.DB=root/'study.sqlite';study_service.ATLAS=root/'empty-atlas'
reader_service.ROOT=root/'reader';reader_service.paper=lambda ident:study_service.resolve('paper',ident)
(reader_service.ROOT/'local-data').mkdir(parents=True,exist_ok=True)
seed=root/'seed.json'
if not seed.exists():
 main=study_service.save_paper(dict(title='QA · Methodology and dataset reading',authors='Local UI test',summary='Isolated demonstration.'))
 source=study_service.save_paper(dict(title='QA · Dataset source paper',authors='Local UI test',summary='Isolated demonstration.'))
 seed.write_text(json.dumps(dict(paper=main['id'],source=source['id'])),encoding='utf-8')
local_app.PORT=8772;local_app.WEB=local_app.ROOT/'web'
http.server.ThreadingHTTPServer(('127.0.0.1',8772),local_app.Handler).serve_forever()
