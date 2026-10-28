"""Temporary UI QA origin: shared read-only catalog, isolated browser storage."""
import http.server
import local_app
import weekly_arxiv
import research_practice
research_practice.DB=local_app.DATA/'research-practice-qa.sqlite'
weekly_arxiv.DB=local_app.DATA/'weekly-arxiv-qa.sqlite'
local_app.PORT=8772
local_app.WEB=local_app.ROOT/'web'
http.server.ThreadingHTTPServer(('127.0.0.1',8772),local_app.Handler).serve_forever()
