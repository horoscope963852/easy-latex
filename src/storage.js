import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

const TEXT_EXTENSIONS = new Set([
  '.tex',
  '.txt',
  '.bib',
  '.cls',
  '.sty',
  '.bst',
  '.tikz',
  '.csv',
  '.tsv',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.svg',
  '.ps',
  '.eps',
  '.lua'
]);

function sanitizeSegment(segment) {
  if (!segment || segment === '.' || segment === '..') {
    throw new Error('Invalid path segment.');
  }
  if (segment.startsWith('.')) {
    throw new Error('Hidden files are not supported.');
  }
  if (/[\0]/.test(segment)) {
    throw new Error('Invalid path segment.');
  }
  return segment;
}

export function sanitizeRelativePath(input) {
  const raw = String(input ?? '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!raw) {
    throw new Error('Path is required.');
  }

  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error('Path escapes the project workspace.');
  }

  const segments = normalized.split('/').map(sanitizeSegment);
  return segments.join('/');
}

export function projectRootDirectory(project) {
  if (project.owner_type === 'user') {
    return path.join(config.storageDir, 'users', String(project.owner_id), 'projects', project.id);
  }
  return path.join(config.storageDir, 'guests', String(project.owner_id), 'projects', project.id);
}

export function projectWorkspaceDirectory(project) {
  return path.join(projectRootDirectory(project), 'workspace');
}

export function previewDirectory(projectId) {
  return path.join(config.previewDir, projectId);
}

export function resolveWorkspacePath(workspaceDir, relativePath) {
  const sanitized = sanitizeRelativePath(relativePath);
  const resolved = path.resolve(workspaceDir, sanitized);
  if (resolved !== workspaceDir && !resolved.startsWith(`${workspaceDir}${path.sep}`)) {
    throw new Error('Resolved path escapes the project workspace.');
  }
  return { sanitized, resolved };
}

export async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureProjectWorkspace(project) {
  await fsp.mkdir(projectWorkspaceDirectory(project), { recursive: true });
}

export async function ensureDirectory(directory) {
  await fsp.mkdir(directory, { recursive: true });
}

export async function removePath(targetPath) {
  await fsp.rm(targetPath, { recursive: true, force: true });
}

export async function calculateDirectorySize(directory) {
  if (!(await pathExists(directory))) {
    return 0;
  }

  let total = 0;
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      total += await calculateDirectorySize(absolute);
      continue;
    }
    if (entry.isFile()) {
      const stat = await fsp.stat(absolute);
      total += stat.size;
    }
  }
  return total;
}

export async function writeStarterProject(project) {
  const workspaceDir = projectWorkspaceDirectory(project);
  await ensureDirectory(workspaceDir);
  const starterPath = path.join(workspaceDir, 'main.tex');
  const sample = String.raw`\documentclass[11pt,a4paper]{ctexart}
\usepackage[margin=1in]{geometry}
\usepackage{hyperref}
\usepackage{fontawesome5}

\title{easy-latex 中文示例 / Chinese Starter}
\author{easy-latex}
\date{\today}

\begin{document}
\maketitle

\section{\faIcon{rocket} 欢迎}
这是一个默认启用中文支持的 easy-latex 示例项目。

\section{\faIcon{language} What to do next}
\begin{itemize}
  \item 在左侧直接编辑 \texttt{.tex} 源码。
  \item 点击 Compile 刷新右侧 PDF 预览。
  \item 使用 Export PDF 下载或保存编译结果。
  \item 默认编译引擎为 XeLaTeX，适合中文、\texttt{fontspec} 和 Font Awesome 宏包。
\end{itemize}

\end{document}
`;
  await fsp.writeFile(starterPath, sample, 'utf8');
}

function sortDirents(entries) {
  return [...entries].sort((left, right) => {
    const leftWeight = left.isDirectory() ? 0 : 1;
    const rightWeight = right.isDirectory() ? 0 : 1;
    if (leftWeight !== rightWeight) {
      return leftWeight - rightWeight;
    }
    return left.name.localeCompare(right.name, 'en');
  });
}

function isProbablyText(buffer) {
  if (!buffer || buffer.length === 0) {
    return true;
  }
  return !buffer.includes(0);
}

export function isEditablePath(relativePath) {
  return TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

export async function listProjectEntries(project) {
  const workspaceDir = projectWorkspaceDirectory(project);
  await ensureDirectory(workspaceDir);
  const items = [];

  async function walk(currentDir, relativePrefix = '') {
    const entries = sortDirents(await fsp.readdir(currentDir, { withFileTypes: true }));
    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }
      const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        items.push({
          path: relativePath,
          type: 'dir',
          size: 0,
          editable: false
        });
        await walk(absolutePath, relativePath);
        continue;
      }

      if (entry.isFile()) {
        const stat = await fsp.stat(absolutePath);
        items.push({
          path: relativePath,
          type: 'file',
          size: stat.size,
          editable: isEditablePath(relativePath)
        });
      }
    }
  }

  await walk(workspaceDir);
  return items;
}

export async function readFileForEditor(project, relativePath) {
  const workspaceDir = projectWorkspaceDirectory(project);
  const { sanitized, resolved } = resolveWorkspacePath(workspaceDir, relativePath);
  const stat = await fsp.stat(resolved);

  if (!stat.isFile()) {
    throw new Error('Only files can be opened in the editor.');
  }

  if (stat.size > config.maxEditableFileBytes) {
    return {
      path: sanitized,
      editable: false,
      tooLarge: true,
      size: stat.size
    };
  }

  const buffer = await fsp.readFile(resolved);
  const editable = isEditablePath(sanitized) || isProbablyText(buffer);

  if (!editable) {
    return {
      path: sanitized,
      editable: false,
      size: stat.size
    };
  }

  return {
    path: sanitized,
    editable: true,
    size: stat.size,
    content: buffer.toString('utf8')
  };
}

export function uniqueFileName(directory, preferredName) {
  const extension = path.extname(preferredName);
  const base = preferredName.slice(0, preferredName.length - extension.length) || 'output';
  let attempt = preferredName;
  let counter = 1;

  while (fs.existsSync(path.join(directory, attempt))) {
    attempt = `${base}-${counter}${extension}`;
    counter += 1;
  }
  return attempt;
}

export function formatProjectName(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    throw new Error('Project name is required.');
  }
  if (trimmed.length > 80) {
    throw new Error('Project name is too long.');
  }
  return trimmed;
}

export function findMainTex(entries) {
  const texFile = entries.find((entry) => entry.type === 'file' && entry.path.toLowerCase().endsWith('.tex'));
  return texFile ? texFile.path : null;
}
