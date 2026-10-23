# Research workspace update

- Local Blog: `/blog.html`; drafts, saved articles, archive/restore, raw Markdown preview and Markdown export. No online publishing.
- Main paper library: `/library.html`; personal papers plus conference catalogue. Daily required reading is a selected subset. Source services and metadata are retained.
- Labs: `/labs.html`; user-defined labs, institutions, named scholars and linked papers. Paper reader affiliation task links to the matching lab editor. Three affiliation groups were verified from original arXiv HTML; companies/cooperation groups are described as such, not asserted to be internal laboratories.
- Lineage: only completed papers with saved classifications or paper relation types enter the read/organized view. Source notes and incomplete papers remain in the paper library.
- Common screenshot paste: shared `theme.js` includes clipboard image handling for text inputs and textareas. PNG/JPEG/WebP up to 8MB each are validated and stored under ignored `local-data/pasted-images/`. Markdown links, not base64, are inserted into field values; previews open original images. Existing form save/auto-save behavior applies. Short fields keep their existing length limits; Todo now has a separate description/screenshot field.
- Daily Todo: unscheduled tasks can be given start/end times via '加入今日安排'; removing time clears start/end while retaining the Todo, notes and subtasks. Removing a custom schedule row also preserves the Todo. No actual current-day tasks were added during QA (temporary test task used 2099-01-01 and was removed).
- Added AI Safety Hot to frequent links, renamed 修行 to 修身, removed individual paper checklist schedule buttons.

Validation: 86 Python tests passed. Clipboard paste was verified through the browser in an unsaved Blog draft and then cleared. Todo scheduling and unscheduling were verified through UI and test task removed. No Git push or external deployment performed.

## Topic-first paper library
- `library.html` now places Topic navigation before source selection. Each Topic has conference papers and separately added personal papers; selected conference records remain in the conference section to avoid duplicate lists.
- Conference and year pills show matching counts. Topic hierarchy supports both inferred title categories and saved custom taxonomy (including descendant topics).
- Chinese titles and available abstract translations are cached in the ignored local reader database. Public conference metadata uses the existing translation provider, with MyMemory as fallback when unavailable; provider limits and missing abstracts are reported without invented content.
- Personal additions still enter the paper library first; the separate today toggle controls the daily reading list. Adding a paper can assign an existing custom Topic.
- Validation: 88 Python tests passed, JavaScript syntax checked, browser verified conference/year filters and bilingual rows.

## Compact atlas and scholar directory
- Atlas classification navigation uses compact Chinese labels and search. Individual classification URLs show bilingual headings and the original three-stage learning paths, timeline and paper list.
- All saved taxonomy nodes have independent maps; creating an empty map does not change reading state or replace existing path edits.
- A classification can explicitly include local arXiv or library records before reading is complete. The global completed-reading collection still follows completion rules.
- Scholar browsing uses a laboratory sidebar and portrait cards. Unknown memberships remain unassigned; the lab editor can select collected scholars without changing their affiliations by inference.
- Existing verified online portraits stay in ignored local storage; report screenshots and unsourced uploads are not exposed by this directory.

## Research note desk and three-column scholar view
- Blog uses the full page width: collapsible nested categories, a date-grouped note timeline, and a Markdown editor/reader. Existing notes without categories remain accessible under Unclassified.
- Categories support nested creation and renaming. Notes save a folder and an editable note date while retaining original creation metadata and revision conflict checks.
- Markdown rendering uses DOM nodes instead of raw HTML, supports clipboard screenshot previews, and offers Ctrl+S saving and Markdown export. Images stay local.
- Scholar navigation now has a laboratory directory on the left, deduplicated linked-paper timelines in the centre, and compact web-portrait scholar cards on the right. Paper date precision is preserved: year-only records are labelled explicitly.
- Verified nested folder persistence, date ordering, Markdown headings/lists/code, image paste/save/reload and one-copy screenshot display in browser; focused workspace regression tests pass.

## Topic context associations
- Each Topic page now has a compact right sidebar for Problem and Solution trees and datasets, including creation and linking existing records. A shared item can belong to multiple Topics; Problem/Solution children inherit parent Topic memberships when displayed. Dataset membership includes subtopics in parent Topic views.
- Dataset Topic-only updates preserve sources and other classifications without requeuing source papers. New datasets started within a Topic preselect that Topic.
- Labs support explicit long-term Topic selections. Existing affiliations and interests are not inferred or overwritten.
- Blog notes can be moved to a recoverable Trash independently of Archive and restored with content intact.
- Validation: 95 Python tests passed; JavaScript syntax checks passed. Browser checked Topic sidebar and preselected dataset form.

## Independent Topic timelines and conference/year browsing
- Topic right sidebar now links to separate Problem and Solution timeline pages. These inherit Topic associations, include child Topics, deduplicate shared papers and order by known publication dates/years. Each page supports category, search and year filters and links into individual lineages.
- Conference and year pills now show clearer counts and selected theme backgrounds; years with no papers are omitted unless explicitly selected.
- Library safety root is labelled 安全, retaining its subcategories and expanding security matching for vulnerabilities, malware, cybersecurity and intrusion detection. Classification remains keyword-based and provisional.
- Checked: 2 chronology/model tests, 6 library/catalog tests, JavaScript syntax, browser conference switching + year filtering and both independent timeline routes. Temporary QA definitions/maps removed after validation.


## Software engineering conferences and library performance
- Added ICSE, FSE, ASE and ISSTA (2025 and 2026) from official research-track accepted lists: 1,738 records total. Importer se_conferences.py preserves failed sources, stable IDs, publication links and missing abstracts without downloading PDFs or syncing Zotero. Source status is private in local-data/se-conferences.json.
- Library navigation now shares Paper Atlas compact theme, Chinese root labels, counts and collapsed category trees. Categories expand through arrows or selecting a root.
- Classification cache persists locally across restarts; annotation/queue snapshots invalidate when the study database changes or the day changes. Counts computed in a single pass. Translation cache reads batched, browser queries reused briefly and superseded requests cancelled.
- Local HTTP measurements after initial cache build: FSE/ASE/ISSTA switches 16-18 ms, ICSE 33 ms (server response only; translation and browser rendering excluded). Service first response after restart was 6.748 s.
- Validation: 98 Python tests passed; JavaScript syntax verified; browser tree expand/collapse and conference/year selection verified.

## Direct scholar creation
- Added a visible 新增学者 button to the Labs & Scholars page, with local name, English signature, institution, homepage, research, optional web avatar and multi-lab selection.
- Scholar records persist in the ignored study database and merge with existing curated/tracked profiles. Supports editing, duplicate checks and revision conflicts. Blank English names no longer accidentally match all lab member lists.
- Existing scholar tracking settings are unchanged. Custom directory entries do not link to unsupported external profile IDs.
- Validation: 6 workspace tests passed; browser created a temporary scholar, selected a lab and verified persistence after refresh. Removed only that QA record afterwards.

## Methods and must-read three-column desks
- Methods left navigation is fixed to 论文阅读方法 / 论文写作方法 / Presentation 技巧. The center shows dated local articles and reusable outlines. Existing method notes remain under their original browser keys, now grouped on the right and filtered by the selected category. Existing research-practice records remain accessible.
- Methods right sidebar contains independently saved/bookmarked external resources with type, known publication date and purpose. Initial writing links were verified from UZH (2026-09-15), Nature Careers (2026-01-14) and MIT CommKit (undated). They are curated resources, not an automatic live news feed. Local method posts and links support editing and recoverable archiving.
- Must-read left sidebar filters papers by saved Topic hierarchy or source labels; center groups active queued papers by original added date, preserves carry-over status, and links into reading tasks. Existing statistics, paper questions, queue actions and reading journals remain on the right.
- Validation includes article/resource save and reload, right-side note category switching, queued-paper Topic filtering and previous-day carry-over. All temporary QA records were removed after checks.

## Resource/reading controls placement and learning stages
- Moved recent writing resources into the Methods left sidebar below its three method categories.
- Moved the existing date / add-paper / select-local-paper panel into the Must-read center column. Reading statistics, questions, calendar and reviews remain right.
- AI Foundations now has four primary study stages: model/component understanding, training, inference and deployment. Existing CV/NLP/Agent domain and section filters remain nested below. Stage membership is inferred for legacy modules without modifying saved metadata; users can explicitly change it in the module editor. Existing notes, cards, decks and notebook records remain intact.
- Tests cover stage classification, explicit overrides, invalid values and avoiding writes of inferred stage fields during read/migration. Fixed an existing PPT-byte test to compare against the same original ZIP instead of regenerating a timestamp-dependent ZIP.

## 科研方法：科研流程分类（2026-10-23）
- 左侧按选题、阅读、基础与复现、方法与实验、论文写作、展示与投稿分组。
- 中间依流程顺序显示子步骤时间线；文章位于对应步骤下，文章内按记录日期排序。Introduction 提供可复制的提纲模板。
- 新文章可选择大类及具体步骤；旧文章无步骤字段时归到对应概览，原指导笔记的浏览器存储键保持不变。
- 移除布局说明文字，保留左侧近期资源及右侧指导笔记和收藏。
- 验证：8 项 workspace_content 测试通过，JS 语法检查通过；浏览器确认 Introduction 子分类保存，精确清理自建 QA 记录。

## 论文双语标题与实验室学者关联（2026-10-23）
- 论文库、今日必读、arXiv、阅读窗口、论文脉络、项目关联、课程及问题页面等使用统一双语标题组件，中文在上、英文在下；原始题录不改写。标题按可见区域加载，服务端缓存复用。
- 在线 Google 与 MyMemory 翻译均返回 429；已补充当前展示的 23 篇论文标题译名到本机缓存，其余未缓存标题在服务不可用时明确提示并保留原文。
- arXiv 卡片新增“实验室／学者”入口；阅读任务中的单位部分也可编辑多实验室、多学者、单位说明与核实来源，支持逐个新增档案。
- 新增 paper-affiliations 记录及版本冲突校验；与原实验室 paperIds 在同一事务同步，不自动加入今日必读或修改完成状态。
- 学者页面的论文分为正式发表和 arXiv 预印本两列；未知状态单独收起。支持点学者筛选，关联论文作者与已核实实验室成员区别标注。
- 可手动核实正式发表状态并填写会议／期刊，论文随状态切换列；作者匹配只使用完整署名，避免重名子串误配。
- 验证：独立数据库 UI 测试关联保存、学者筛选、预印本到发表列切换成功；真实 arXiv 卡片入口及实际学者页面检查通过。Python 全套测试及标题／发表分组 Node 测试通过。

## 当前交互与统一题词（2026-10-23）
- 学者页：左侧实验室按名称 A–Z 排列，大学／公司小字展示；姓名、头像、论文按钮均可选择学者，读取原学者档案 18 篇论文、已有追踪与本地库，完整署名匹配保留身份待核实提示。已验证从鑫 7 篇发表与 43 篇 arXiv、实验室切换。
- 所属大学／公司字段独立保存；统一桌面移除启动全部网站、刷新当前页、独立打开入口。
- 阅读窗口固定完成进度、关闭与任务筛选；可查看全部／未完成／已完成，跳到下一个未完成，逐项标记或取消完成。独立 UI 数据库验证 0→1→0，真实论文仅测试筛选；滚动超过 9700px 时工具栏位置保持固定。
- 115 项 Python 测试通过；JavaScript 语法检查通过。
- 按最新要求先完成统一题词：将“一个入口 · 每天积累”换为“世上无难事，只要肯登攀。”，白字深色主题底，悬停标明《水调歌头·重上井冈山》。浏览器核验白色 rgb(255,255,255)。
- 科研方法中间“自写文章／外部链接”分栏仍待后续进行，本轮未改动该布局。

2026-10-23: Lab selection now shows recorded members as individual cards even before scholar profiles exist, with a prefilled profile creation action. Added explicitly maintained lab leaders field and PI/member sections; selecting a scholar keeps the current lab directory visible. Leaders contribute to lab paper membership. Verified Spine AI selection and edit/profile forms in browser without changing user records; test_scholar_papers: 4 passed; labs.js syntax passed. Preview: local-data/previews/lab-members-linked.png.

2026-10-23: Added white daily motto 日行一善，日日登攀 below the calm reminder. Daily DDL now covers all 10 conference_catalog venues plus retained ECCV (11 cards), merges future /api/conferences venues without guessed dates, and shows per-venue verification dates. Added official ICSE 2027, FSE 2027 extension, ISSTA 2027 dates; ASE pending. Browser checked 11 cards and upcoming filter; JS syntax and catalog merge assertions passed. Previews: daily-kindness-motto.png, all-library-conference-ddls.png under ignored local-data/previews.
