# Release Process

[中文版本](release-process.zh-CN.md)

## Versioning Strategy

`easy-latex` uses Semantic Versioning:

- `MAJOR`: incompatible deployment or API changes
- `MINOR`: backward-compatible feature additions
- `PATCH`: backward-compatible fixes and documentation-only corrections that materially affect installation or behavior

Tags should use the format:

```text
vX.Y.Z
```

Examples:

- `v1.0.0`
- `v1.1.0`
- `v1.1.2`

## Release Checklist

1. Update code, scripts, docs, and translations
2. Update `CHANGELOG.md` and `CHANGELOG.zh-CN.md`
3. If the application version changes, update `package.json`
4. Verify:
   - `find src public -name '*.js' -print0 | xargs -0 -n1 node --check`
   - `scripts/verify-install.sh`
5. Commit on `main`
6. Create an annotated tag
7. Push commit and tag
8. Draft a GitHub Release from that tag

## Tagging Commands

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main
git push origin v1.0.0
```

## GitHub Release Notes

Use the matching changelog entry as the release notes body. Keep release notes concise:

- summary
- major features
- deployment notes
- known limitations
