# easy-latex

`easy-latex` 是一个面向单机部署的在线 LaTeX 编辑与编译系统，支持直接通过 `IP:9999` 访问。仓库中包含前端、后端、systemd 单元以及用于复刻当前运行状态的安装脚本。

[English README](README.md)

## 这个仓库发布了什么

- 前端和后端源码
- 适合新服务器的一键安装/验证脚本
- `systemd` 服务单元
- 环境变量模板
- 可复刻的 TeX/工具链依赖清单

本仓库 **不包含** 运行时数据：

- 用户数据
- 数据库内容
- 会话
- 预览文件
- 上传项目
- `/etc/easy-latex/easy-latex.env`

## 主要特性

- 仅支持用户名 + 密码
- 管理员控制用户系统开关
- 关闭登录后支持游客模式
- 支持多文件 LaTeX 项目及主 `.tex` 选择
- 源码编辑区与 PDF 预览区并排显示
- 手动编译和可选自动编译
- 编译后的 PDF 可下载或保存到登录用户云空间
- 每个用户 `256MB` 配额
- 首次登录引导
- 中英双语 UI
- 面向中文文档的 XeLaTeX 默认工作流

## 推荐的发布/部署方式

推荐把这个仓库作为唯一源码入口，并通过下面的方式部署：

```bash
git clone https://github.com/horoscope963852/easy-latex.git
cd easy-latex
sudo ./scripts/bootstrap-server.sh
```

相比只发布一个大脚本，这种方式更适合版本管理、代码审查、协作和可复刻部署。

## 在新服务器上的快速开始

建议运行环境：

- Debian 13 (`trixie`) 或兼容系统
- `systemd`
- 可以访问 `apt` 和 `npm`

执行：

```bash
git clone https://github.com/horoscope963852/easy-latex.git /root/easy-latex
cd /root/easy-latex
sudo ./scripts/bootstrap-server.sh
```

脚本会自动：

1. 安装基础系统依赖和 Node.js 20
2. 将仓库同步到 `/opt/easy-latex`
3. 安装 TeX 与工具链依赖
4. 执行 `npm ci`
5. 安装并启动 `systemd` 服务
6. 运行 smoke test 验证

随后访问：

```text
http://服务器IP:9999/admin
```

创建首个管理员账号即可。

## 重要路径

- 代码：`/opt/easy-latex`
- 数据：`/var/lib/easy-latex`
- 环境文件：`/etc/easy-latex/easy-latex.env`
- 服务：`easy-latex.service`
- 清理定时器：`easy-latex-cleanup.timer`

## 仓库结构

- `public/`: 前端资源
- `src/`: 后端源码
- `scripts/bootstrap-server.sh`: 一键初始化服务器
- `scripts/install-tex-deps.sh`: 安装 TeX/工具链依赖
- `scripts/install-systemd.sh`: 安装服务
- `scripts/verify-install.sh`: 验证安装
- `deploy/apt-packages.txt`: apt 依赖清单
- `systemd/`: systemd 单元文件

## 环境变量配置

以 `.env.example` 为起点。部署后的实际环境文件在：

```text
/etc/easy-latex/easy-latex.env
```

默认值包括：

- 端口：`9999`
- 用户系统：开启
- 默认引擎：`xelatex`
- 普通用户并发登录上限：`10`
- 用户空间配额：`256MB`
- 游客保留时间：`24h`
- 安全模式下禁用 `shell-escape`

## 验证

安装完成后，验证脚本会执行一次 XeLaTeX + bibliography 的 smoke test。也可以手动重新执行：

```bash
sudo /opt/easy-latex/scripts/verify-install.sh
```

## 其他文档

- 运行环境基线（英文）：[runtime-baseline.md](docs/runtime-baseline.md)
- 运行环境基线（中文）：[runtime-baseline.zh-CN.md](docs/runtime-baseline.zh-CN.md)
- GitHub SSH 发布（英文）：[github-ssh-publish.md](docs/github-ssh-publish.md)
- GitHub SSH 发布（中文）：[github-ssh-publish.zh-CN.md](docs/github-ssh-publish.zh-CN.md)
- 版本发布流程（英文）：[release-process.md](docs/release-process.md)
- 版本发布流程（中文）：[release-process.zh-CN.md](docs/release-process.zh-CN.md)
- Docker 部署（英文）：[docker-deploy.md](docs/docker-deploy.md)
- Docker 部署（中文）：[docker-deploy.zh-CN.md](docs/docker-deploy.zh-CN.md)
- 更新日志（英文）：[CHANGELOG.md](CHANGELOG.md)
- 更新日志（中文）：[CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md)
