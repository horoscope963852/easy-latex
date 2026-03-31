# Docker 部署

[English version](docker-deploy.md)

## 目标

这套 Docker 配置用于容器化复刻当前 `easy-latex` 的运行环境，包括前端、后端、TeX 工具链和字体。

它是宿主机引导脚本之外的另一种部署方式。对于单台 VPS，仍然推荐优先使用基于 `systemd` 的宿主机部署。

## 相关文件

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

## 容器中包含的内容

- 基于 Debian `trixie` 的 Node.js 20
- `deploy/apt-packages.txt` 中列出的同一套 TeX/工具链依赖
- 通过 `node src/server.js` 直接运行的 `easy-latex`

## 容器中不会使用的内容

- `systemd`
- 宿主机上的 cleanup timer 单元

不过应用本身仍然保留内部清理循环，因此游客/会话清理仍然会生效。

## 使用 Docker Compose 运行

```bash
docker compose up -d --build
```

然后访问：

```text
http://SERVER_IP:9999/admin
```

## 数据持久化

应用数据会保存在 Docker 命名卷：

```text
easy_latex_data
```

它在容器内对应的路径是：

```text
/var/lib/easy-latex
```

## 说明

- 由于镜像内包含了较完整的 TeX/工具链依赖，镜像体积会比较大。
- 如果文档依赖外部命令，项目的编译模式仍然需要切换到 `relaxed`。
