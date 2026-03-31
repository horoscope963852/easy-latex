# 运行环境基线

本仓库的目标是复刻 `easy-latex` 当前的单机部署形态。

[English version](runtime-baseline.md)

## 已测试的主机环境

- 操作系统：Debian 13（`trixie`）或兼容系统
- Node.js：20.x
- npm：Node 20 自带版本
- 服务管理器：`systemd`
- 端口：`9999`

## 已覆盖的工具链基线

引导脚本会安装 [apt-packages.txt](../deploy/apt-packages.txt) 中列出的依赖，目前包括：

- TeX Live 基础包、XeLaTeX、LuaLaTeX、语言包、science/bibtex/pstricks 扩展
- `latexmk`、`biber`、`xindy`
- `python3-pygments`，用于 `minted`
- `gnuplot`、`graphviz`、`asymptote`、`inkscape`、`imagemagick`
- `ghostscript`、`poppler-utils`
- CJK 字体，包括 `Noto Sans CJK SC`、`Noto Serif CJK SC`、`WenQuanYi Zen Hei`

## 运行时路径

- 代码：`/opt/easy-latex`
- 环境文件：`/etc/easy-latex/easy-latex.env`
- 数据：`/var/lib/easy-latex`
- 服务：`easy-latex.service`
- 清理定时器：`easy-latex-cleanup.timer`

## 可复刻性说明

- 仓库中同时包含前端和后端源码。
- 仓库不包含运行时状态、用户数据、数据库文件、会话、预览文件或上传项目。
- 对于新服务器，推荐使用 `scripts/bootstrap-server.sh` 作为标准复刻入口。
