# 版本发布流程

[English version](release-process.md)

## 版本策略

`easy-latex` 采用语义化版本号：

- `MAJOR`：不兼容的部署方式或 API 变化
- `MINOR`：向后兼容的新功能
- `PATCH`：向后兼容的修复，以及会显著影响安装/行为的文档修正

Git 标签建议使用：

```text
vX.Y.Z
```

例如：

- `v1.0.0`
- `v1.1.0`
- `v1.1.2`

## 发布检查清单

1. 更新代码、脚本、文档和翻译
2. 更新 `CHANGELOG.md` 和 `CHANGELOG.zh-CN.md`
3. 如果应用版本有变化，同步更新 `package.json`
4. 执行验证：
   - `find src public -name '*.js' -print0 | xargs -0 -n1 node --check`
   - `scripts/verify-install.sh`
5. 在 `main` 上提交
6. 创建带注释的 Git 标签
7. 推送提交和标签
8. 在 GitHub 上基于该标签创建 Release

## 打标签命令

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main
git push origin v1.0.0
```

## GitHub Release 说明

发布说明正文建议直接基于对应版本的 changelog，保持简洁：

- 版本摘要
- 主要功能
- 部署注意事项
- 已知限制
