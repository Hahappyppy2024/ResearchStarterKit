// Topic identities and explicit paper memberships come from Paper Atlas.
export function topicIndex(nodes,maps,papers){
 const topics=nodes.filter(n=>n.kind==='topic'),byId=new Map(topics.map(n=>[n.id,n])),members=new Map(topics.map(n=>[n.id,new Set()]));
 const normalize=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const aliases=n=>[n.id,n.name,n.en,n.id.replace(/^tax-/,''),...((n.name==='Agent / LLM')?['Agent','LLM','智能体']:[])].filter(Boolean).map(normalize);
 for(const n of topics){const map=maps.find(m=>m.id===(n.lineageId||'taxonomy-'+n.id)),explicit=new Set(map?.paperIds||[]),names=new Set(aliases(n));for(const p of papers){if(explicit.has(p.id)||(p.topicIds||[]).includes(n.id)||(!p.autoClassification&&(p.topics||[]).some(t=>names.has(normalize(t)))))members.get(n.id).add(p.id)}}
 // Parents include descendants. Cycle guards protect malformed imported trees.
 for(const n of topics){let parent=n.parentId,seen=new Set([n.id]);while(parent&&byId.has(parent)&&!seen.has(parent)){seen.add(parent);for(const id of members.get(n.id))members.get(parent).add(id);parent=byId.get(parent).parentId}}
 const classified=new Set([...members.values()].flatMap(s=>[...s]));
 return {topics,members,unclassified:new Set(papers.filter(p=>!classified.has(p.id)).map(p=>p.id))};
}
