"""Read-only hierarchical browsing of the existing local conference catalog."""
import collections
import contextlib
import json
import pathlib
import re
import sqlite3
import threading
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent
VENUES = ["AAAI", "NeurIPS", "ICML", "ICLR", "CVPR", "ICCV"]
# Personal browsing taxonomy, not official conference tracks. Multi-label matches.
RULES = [
 ("agents", "智能体 / Agents", [
  ("planning", "规划与推理", r"\bagent(s|ic)?\b|multi.agent|tool.use|tool.call|agent.*plan"),
  ("multiagent", "多智能体协作", r"multi.agent|agent.*collabor|agent.*cooper"),
  ("memory", "记忆与运行框架", r"agent.*(memory|runtime|harness|orchestrat)|agent operating|\baios\b"),
  ("agentsecurity", "智能体安全", r"prompt.injection|agent.*(secur|safety|attack)|tool.poison")]),
 ("vision", "计算机视觉 / Vision", [
  ("detection", "目标检测与跟踪", r"object.detect|open.vocabulary.detect|\bdetr\b|object.track"),
  ("segmentation", "图像分割", r"segmentat|panoptic"),
  ("video", "视频理解", r"\bvideo\b|action.recognition|temporal.ground"),
  ("3d", "三维视觉", r"\b3d\b|point.cloud|neural.radiance|\bnerf\b|gaussian.splat|depth.estimat"),
  ("image", "图像识别与恢复", r"image.classif|image.recogni|image.restor|super.resolution|denois|deblur"),
  ("remote", "遥感与农业视觉", r"remote.sens|satellite|aerial|agricultur|crop.detect")]),
 ("language", "语言模型与自然语言 / Language", [
  ("llm", "大语言模型", r"large.language|\bllms?\b|language.model"),
  ("reasoning", "推理与数学", r"chain.of.thought|reasoning|mathematical|theorem.prov"),
  ("retrieval", "检索增强与知识", r"retrieval.augment|\brag\b|knowledge.graph|knowledge.edit"),
  ("code", "代码与程序", r"code.generat|program.synth|code.language|software.engineer")]),
 ("multimodal", "多模态 / Multimodal", [
  ("vlm", "视觉语言模型", r"vision.language|visual.language|\bvlms?\b|multimodal|multi.modal"),
  ("audio", "音频与语音", r"\baudio\b|\bspeech\b|sound.event"),
  ("alignment", "跨模态对齐", r"cross.modal|text.image|image.text|text.video|video.text")]),
 ("generation", "生成模型 / Generative Models", [
  ("diffusion", "扩散与流模型", r"diffusion|flow.match|rectified.flow"),
  ("visualgen", "图像与视频生成", r"image.generat|video.generat|text.to.image|text.to.video"),
  ("generative", "其他生成建模", r"generative|variational.autoencoder|\bgans?\b")]),
 ("rl", "强化学习 / Reinforcement Learning", [
  ("policy", "策略学习", r"reinforcement.learning|policy.optim|policy.gradient|actor.critic"),
  ("offline", "离线与模仿学习", r"offline.rl|offline.reinforcement|imitation.learning|learning.from.demonstration"),
  ("world", "世界模型与决策", r"world.model|model.based.rl|markov.decision")]),
 ("learning", "学习方法 / Learning", [
  ("selfsupervised", "自监督与表示学习", r"self.supervis|contrastive.learning|representation.learning"),
  ("adaptation", "迁移与泛化", r"domain.adapt|domain.general|out.of.distribution|transfer.learning|test.time.adapt"),
  ("continual", "持续与小样本学习", r"continual.learning|lifelong|few.shot|zero.shot|meta.learning"),
  ("federated", "联邦与分布式学习", r"federated|distributed.learning|decentralized.learning")]),
 ("safety", "安全与可信 / Trustworthy AI", [
  ("security", "攻击与防御", r"adversarial|backdoor|jailbreak|prompt.injection|poison|watermark"),
  ("alignment", "对齐与安全", r"\balignment\b|\bsafety\b|\brlhf\b|preference.optim"),
  ("privacy", "隐私与公平", r"\bprivacy\b|differentially.private|\bfairness\b|unlearning"),
  ("explain", "可解释性与可靠性", r"interpretabil|explainabil|uncertainty|calibration|hallucinat")]),
 ("efficiency", "高效模型与系统 / Efficient AI", [
  ("compression", "剪枝、量化与压缩", r"\bprun|quantiz|\bspars|model.compress|distillat"),
  ("inference", "推理加速与部署", r"inference.*(efficien|acceler|serving)|kv.cache|speculative.decod|model.serving"),
  ("training", "高效训练与适配", r"parameter.efficient|\blora\b|low.rank.adapt|efficient.train|training.efficien")]),
 ("graphs", "图学习与结构数据 / Graphs", [
  ("gnn", "图神经网络", r"graph.neural|graph.transformer|graph.learning"),
  ("timeseries", "时间序列与预测", r"time.series|forecast|spatio.temporal"),
  ("recommendation", "推荐与排序", r"recommendation|recommender|learning.to.rank")]),
 ("robotics", "机器人与具身智能 / Robotics", [
  ("embodied", "具身与机器人学习", r"robot|embodied|manipulation|loco.motion|locomotion"),
  ("navigation", "导航与自动驾驶", r"navigation|autonomous.driv|motion.plan|trajectory.plan")]),
 ("science", "科学与领域应用 / AI for Science", [
  ("bio", "生物与分子", r"protein|molecul|drug.discover|genomic"),
  ("medical", "医疗健康", r"medical|clinical|healthcare|diagnosis"),
  ("physical", "物理、气候与科学计算", r"physics|climate|weather|partial.differential|scientific.discover")]),
 ("theory", "理论与优化 / Theory", [
  ("optimization", "优化与收敛", r"gradient.descent|convergence|convex|stochastic.optim|nonconvex"),
  ("statistics", "统计与学习理论", r"learning.theory|generalization.bound|sample.complexity|minimax|statistical.inference"),
  ("causal", "因果推断", r"causal|causality|counterfactual")]),
 ("evaluation", "数据与评测 / Data & Evaluation", [
  ("benchmarks", "数据集与基准", r"\bbenchmark|\bdataset|evaluation.framework"),
  ("data", "数据质量与合成", r"data.curat|data.quality|synthetic.data|data.selection")]),
]
COMPILED = [(cid, label, [(sid, slabel, re.compile(pattern, re.I)) for sid,slabel,pattern in subs]) for cid,label,subs in RULES]
LOCK = threading.Lock()
CACHE = None
CACHED_SIGNATURE = None

def signature():
    paths=[ROOT/"data/library.sqlite", ROOT/"data/library.sqlite-wal", ROOT/"data/conferences.json"]
    return tuple((p.stat().st_size,p.stat().st_mtime_ns) if p.exists() else None for p in paths)

def classify_paper(p):
    text = p.get("title", "") + " " + p.get("summary", "")
    labels = [(cid,sid) for cid,_,subs in COMPILED for sid,_,pattern in subs if pattern.search(text)]
    return labels or [("other", "unclassified")]

def title_key(title):
    return re.sub(r"\W+", "", unicodedata.normalize("NFKC", title).casefold())

def arxiv_link(p):
    for key in ("arxiv", "arxivUrl", "source", "pdf"):
        url = p.get(key, "")
        if isinstance(url,str) and re.match(r"https?://(?:www\.)?arxiv\.org/(?:abs|pdf)/",url):
            return url.replace("http:","https:",1)
    return ""

def catalog(force=False):
    global CACHE, CACHED_SIGNATURE
    with LOCK:
        if CACHE is not None and not force and signature()==CACHED_SIGNATURE:
            return CACHE
        with contextlib.closing(sqlite3.connect(ROOT/"data/library.sqlite")) as c:
            rows = c.execute("SELECT body FROM papers WHERE venue IN (?,?,?,?,?,?) OR venue='arXiv'", VENUES).fetchall()
        raw = [json.loads(row[0]) for row in rows]
        arxiv = {title_key(p["title"]):arxiv_link(p) for p in raw if p.get("venue")=="arXiv" and arxiv_link(p)}
        groups = collections.defaultdict(list)
        for p in raw:
            if p.get("venue") not in VENUES: continue
            p = dict(p)
            p["categories"] = classify_paper(p)
            p["arxivUrl"] = arxiv_link(p) or arxiv.get(title_key(p["title"]), "")
            groups[(int(p["year"]),p["venue"])].append(p)
        for papers in groups.values(): papers.sort(key=lambda p:p["title"].casefold())
        try: sources = json.loads((ROOT/"data/conferences.json").read_text(encoding="utf-8"))["sources"]
        except (OSError,KeyError,ValueError): sources=[]
        CACHE = {"groups":dict(groups), "sources":{(int(s["year"]),s["venue"]):s for s in sources}}
        CACHED_SIGNATURE = signature()
        return CACHE

def navigation(force=False):
    data = catalog(force)
    years = sorted({2027,2026,2025}|{y for y,_ in data["groups"]},reverse=True)
    return {"years":[{"year":year,"conferences":[{"venue":v,"count":len(data["groups"].get((year,v),[]))} for v in VENUES]} for year in years],
            "classification":"基于本地标题和可用摘要的关键词多分类，非会议官方分类，待人工复核。"}

def browse(year, venue, category="", subcategory="", query="", page=0):
    if venue not in VENUES or year not in (2025,2026,2027): raise ValueError("请选择有效的年份与会议")
    data = catalog()
    papers = data["groups"].get((year,venue),[])
    counts = collections.Counter(pair for p in papers for pair in p["categories"])
    taxonomy=[]
    for cid,label,subs in RULES+[("other","待分类 / Other",[("unclassified","待细分","")])]:
        children=[{"id":sid,"label":slabel,"count":counts[(cid,sid)]} for sid,slabel,_ in subs]
        count=sum(1 for p in papers if any(c==cid for c,_ in p["categories"]))
        taxonomy.append({"id":cid,"label":label,"count":count,"children":children})
    filtered=[p for p in papers if (not category or any(c==category and (not subcategory or s==subcategory) for c,s in p["categories"])) and (not query or query.casefold() in (p["title"]+" "+str(p.get("authors",""))).casefold())]
    count=len(filtered)
    page=max(0,min(page,max(0,(count-1)//30)))
    return {"year":year,"venue":venue,"total":len(papers),"count":count,"page":page,"pageSize":30,"taxonomy":taxonomy,"papers":filtered[page*30:(page+1)*30],"source":data["sources"].get((year,venue))}
