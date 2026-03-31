# GitHub Publish via SSH

These steps assume the repository is already prepared locally.

## 1. Create an SSH key on the server

```bash
ssh-keygen -t ed25519 -C "your-github-email@example.com"
```

Accept the default path: `~/.ssh/id_ed25519`

## 2. Print the public key

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the full output.

## 3. Add the key to GitHub

GitHub:

1. Open `Settings`
2. Open `SSH and GPG keys`
3. Click `New SSH key`
4. Paste the public key

## 4. Test SSH access

```bash
ssh -T git@github.com
```

GitHub will likely ask you to confirm the host key the first time.

## 5. Create a new empty GitHub repository

Example:

- Owner: your account
- Repository name: `easy-latex`
- Do not add README, `.gitignore`, or license if this local tree already has them

## 6. Set Git identity locally

```bash
git config user.name "Your Name"
git config user.email "your-github-email@example.com"
```

## 7. Commit and push

```bash
git add .
git commit -m "Initial public release"
git branch -M main
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/easy-latex.git
git push -u origin main
```

## 8. Update the clone command in README

After the first push succeeds, update any placeholder repository URL in the docs to your final GitHub SSH/HTTPS URL.
