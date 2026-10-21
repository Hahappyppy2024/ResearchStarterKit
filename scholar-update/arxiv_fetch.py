import json, sys, urllib.request, urllib.parse, xml.etree.ElementTree as ET

def fetch(author):
    query = 'au:"' + author.replace('"', '').replace(' ', '_') + '"'
    url = 'https://export.arxiv.org/api/query?' + urllib.parse.urlencode(dict(search_query=query, start=0, max_results=50, sortBy='submittedDate', sortOrder='descending'))
    request = urllib.request.Request(url, headers={'User-Agent':'LocalScholarNotebook/1.0'})
    with urllib.request.urlopen(request, timeout=35) as response:
        root = ET.fromstring(response.read(4000000))
    ns = {'a':'http://www.w3.org/2005/Atom'}
    norm = lambda s: ''.join(c for c in s.casefold() if c.isalnum())
    papers = []
    for entry in root.findall('a:entry', ns):
        authors = [v.findtext('a:name', '', ns) for v in entry.findall('a:author', ns)]
        if norm(author) not in [norm(a) for a in authors]:
            continue
        identity = entry.findtext('a:id', '', ns).split('/abs/')[-1]
        import re
        identity = re.sub(r'v\d+$', '', identity)
        if not re.fullmatch(r'(?:\d{4}\.\d{4,5}|[A-Za-z.-]+/\d{7})', identity):
            continue
        papers.append(dict(id=identity, title=' '.join(entry.findtext('a:title', '', ns).split()), authors=authors,
                           published=entry.findtext('a:published', '', ns), updated=entry.findtext('a:updated', '', ns),
                           url='https://arxiv.org/abs/'+identity, pdf='https://arxiv.org/pdf/'+identity))
    return papers

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(fetch(sys.argv[1]), ensure_ascii=False))
