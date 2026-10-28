# 仓库目录与迁移

本次在独立发布副本整理仓库。本机正在运行的科研网站与数据库不移动。

| 原位置 | 新位置 |
| --- | --- |
| 根目录 Python、PowerShell、CMD、JS 工具 | `toolkit/` |
| `web*` 页面、共享资源 | `toolkit/web*`，保留内部相对结构 |
| `scholar-update/` | `toolkit/scholar-update/` |
| 根目录 `test_*` | `tests/` |
| 各模块 Markdown 说明 | `docs/local-toolkit/` |
| 原 README | `docs/archive/` |
| 新雾蓝荷塘网站 | `sites/mist-blue-lotus/` |

工具源码保留用于后续维护，不等同于完整个人工作环境。使用工具时将工作目录设为 `toolkit/`，自行配置数据与依赖。原有课程资料生成器和个人学者追踪快照不随本次目录重排重新发布；课程 UI 代码可保留，但不提供课程正文、材料或数据库。新网站完全独立，不读取这些工具目录。

部分旧测试依赖原本地环境；这里仅保留历史测试源码。新公开网站的发布检查使用 `scripts/check_public_release.py`。不要把本机数据库复制进仓库来使历史测试通过。
