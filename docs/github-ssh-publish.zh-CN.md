# 通过 SSH 发布到 GitHub

这些步骤假定你的本地仓库已经准备完成。

[English version](github-ssh-publish.md)

## 1. 在服务器上创建 SSH key

```bash
ssh-keygen -t ed25519 -C "your-github-email@example.com"
```

默认路径可直接接受：`~/.ssh/id_ed25519`

## 2. 打印公钥

```bash
cat ~/.ssh/id_ed25519.pub
```

复制整行输出内容。

## 3. 把公钥加入 GitHub

GitHub 网页操作：

1. 打开 `Settings`
2. 打开 `SSH and GPG keys`
3. 点击 `New SSH key`
4. 粘贴公钥

## 4. 测试 SSH 访问

```bash
ssh -T git@github.com
```

第一次通常会提示确认主机指纹。

## 5. 创建一个空的 GitHub 仓库

示例建议：

- Owner：你的账号
- Repository name：`easy-latex`
- 不要在创建时自动添加 README、`.gitignore` 或 License

## 6. 设置本地 Git 身份

```bash
git config user.name "Your Name"
git config user.email "your-github-email@example.com"
```

## 7. 提交并推送

```bash
git add .
git commit -m "Initial public release"
git branch -M main
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/easy-latex.git
git push -u origin main
```

## 8. 更新 README 中的 clone 地址

首次推送成功后，把 README 里的占位仓库地址更新成你最终使用的 GitHub 仓库地址。
