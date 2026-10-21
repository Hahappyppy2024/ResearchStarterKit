from pathlib import Path
p=Path("D:/000_CV_projects/Top_projects/research-atlas/scripts/local.mjs")
s=p.read_text("utf8")
old="res.writeHead(response.status,Object.fromEntries(response.headers));res.end(bytes);"
new="""const responseHeaders=Object.fromEntries(response.headers);
  // Only the user's local research hub may embed this local-only site.
  if(responseHeaders['content-security-policy'])responseHeaders['content-security-policy']=responseHeaders['content-security-policy'].replace("frame-ancestors 'none'","frame-ancestors http://127.0.0.1:8769");
  res.writeHead(response.status,responseHeaders);res.end(bytes);"""
if old in s:p.write_text(s.replace(old,new),"utf8");print("Local Paper Atlas embedding allowed for the research hub only.")
elif "frame-ancestors http://127.0.0.1:8769" in s:print("Integration already present.")
else:raise RuntimeError("Local server changed; inspect before patching.")
