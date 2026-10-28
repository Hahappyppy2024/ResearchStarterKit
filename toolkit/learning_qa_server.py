import http.server,pathlib
import projects_server as web,learning_service as s
s.DB=pathlib.Path(__file__).parent/'local-data'/'learning-qa.sqlite'
s.FILES=pathlib.Path(__file__).parent/'local-data'/'learning-qa-files'
web.PORT=8771
http.server.ThreadingHTTPServer(('127.0.0.1',8771),web.Handler).serve_forever()
