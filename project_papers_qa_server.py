"""Isolated project-paper bridge validation; shares the existing isolated reader catalog."""
import pathlib,http.server
import projects_server as web,projects_service as projects,study_service as study,local_app,learning_service
root=pathlib.Path(__file__).parent/'local-data'/'assets-ui-qa';root.mkdir(parents=True,exist_ok=True)
projects.DB_PATH=root/'projects.sqlite';study.DB=root/'study.sqlite';study.ATLAS=root/'empty-atlas';local_app.DATA=root
learning_service.DB=root/'learning.sqlite';learning_service.FILES=root/'learning-files'
web.PORT=8771
http.server.ThreadingHTTPServer(('127.0.0.1',8771),web.Handler).serve_forever()
