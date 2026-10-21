"""Finish the initial catalog after any currently running import; safe to restart."""
import time
from local_app import DATA, ingest_files, import_running, sync_zotero, write_json, now

if __name__=="__main__":
    while import_running():
        time.sleep(20)
    try:
        ingest_files()
        result=sync_zotero()
        write_json(DATA/"initial-import-result.json",{"finishedAt":now().isoformat(),"result":result})
        write_json(DATA/"last-job.json",{"running":False,"lastRun":now().isoformat(),"message":"首轮全量目录导入完成："+str(result)})
    except Exception as e:
        write_json(DATA/"initial-import-result.json",{"failedAt":now().isoformat(),"error":str(e),"resume":"在网页点击同步到 Zotero，或重新运行 finish_import.py。"})
        write_json(DATA/"last-job.json",{"running":False,"lastRun":now().isoformat(),"message":"导入暂停，可续传："+str(e)})
        raise
