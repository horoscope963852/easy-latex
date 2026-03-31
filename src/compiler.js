import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { config } from './config.js';
import {
  ensureDirectory,
  pathExists,
  previewDirectory,
  projectWorkspaceDirectory,
  removePath,
  resolveWorkspacePath
} from './storage.js';

const semaphore = {
  active: 0,
  waiters: []
};

async function withCompileSlot(task) {
  if (semaphore.active >= config.compileConcurrency) {
    await new Promise((resolve) => {
      semaphore.waiters.push(resolve);
    });
  }

  semaphore.active += 1;
  try {
    return await task();
  } finally {
    semaphore.active -= 1;
    const next = semaphore.waiters.shift();
    if (next) {
      next();
    }
  }
}

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    const append = (bucket, chunk) => {
      const text = chunk.toString('utf8');
      const combined = bucket + text;
      if (combined.length > config.maxCompileLogChars * 3) {
        return combined.slice(-config.maxCompileLogChars * 3);
      }
      return combined;
    };

    child.stdout.on('data', (chunk) => {
      stdout = append(stdout, chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr = append(stderr, chunk);
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

function clampLogText(logText) {
  if (!logText) {
    return '';
  }
  if (logText.length <= config.maxCompileLogChars) {
    return logText;
  }
  return logText.slice(-config.maxCompileLogChars);
}

export function detectDocumentProfile(sourceText) {
  const source = String(sourceText ?? '');
  const usesCtexClass = /\\documentclass(?:\[[^\]]*\])?\{ctex[a-z]*\}/u.test(source);
  const usesCtexPackage = /\\usepackage(?:\[[^\]]*\])?\{ctex\}/u.test(source);
  const usesXeCJK = /\\usepackage(?:\[[^\]]*\])?\{xeCJK\}|\\setCJK(?:main|sans|mono)font/u.test(source);
  const usesLuatexja = /\\usepackage(?:\[[^\]]*\])?\{luatexja(?:-fontspec)?\}|\\setmainjfont/u.test(source);
  const usesCjkFontSetup = /\\setCJK(?:main|sans|mono)font|\\setCJKfamilyfont|\\newCJKfontfamily|\\setmainjfont/u.test(source);

  return {
    usesFontspec: /\\usepackage(?:\[[^\]]*\])?\{fontspec\}|\\set(?:main|sans|mono)font|\\newfontfamily/u.test(source),
    usesCtex: usesCtexClass || usesCtexPackage || usesXeCJK || usesLuatexja,
    usesCtexClass,
    usesCtexPackage,
    usesXeCJK,
    usesLuatexja,
    usesCjkFontSetup,
    usesFontawesome5: /\\usepackage(?:\[[^\]]*\])?\{fontawesome5\}/u.test(source),
    containsCjk: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(source)
  };
}

function extractErrors(logText) {
  const errors = [];
  const seen = new Set();
  const fileLinePattern = /^(.+?):(\d+): (.+)$/gm;
  const bangPattern = /^! (.+)$/gm;

  for (const match of logText.matchAll(fileLinePattern)) {
    const message = `${match[1]}:${match[2]} ${match[3]}`;
    if (!seen.has(message)) {
      seen.add(message);
      errors.push({
        file: match[1],
        line: Number(match[2]),
        message: match[3]
      });
    }
  }

  for (const match of logText.matchAll(bangPattern)) {
    const message = match[1];
    if (!seen.has(message)) {
      seen.add(message);
      errors.push({ message });
    }
  }

  return errors.slice(0, 20);
}

function extractMissingCharacters(logText) {
  const seen = new Set();
  const characters = [];
  for (const match of logText.matchAll(/Missing character: There is no (.+?) \(U\+[0-9A-F]+\)/gu)) {
    const character = match[1];
    if (character.length > 3 || seen.has(character)) {
      continue;
    }
    seen.add(character);
    characters.push(character);
  }
  return characters.slice(0, 10);
}

function analyzeCompilation(logText, project, sourceProfile) {
  const warnings = [];
  const hints = [];
  let recommendedEngine = null;
  const hasLatinFallback = /Missing character: There is no .+ in font \[(?:lmroman|Latin Modern|latinmodern|lmr)/i.test(logText);

  if (
    project.engine === 'pdflatex' &&
    (sourceProfile.usesFontspec || sourceProfile.usesCtex || sourceProfile.containsCjk)
  ) {
    recommendedEngine = 'xelatex';
    hints.push({
      code: 'switch_to_xelatex',
      recommendedEngine
    });
  }

  const missingCharacters = extractMissingCharacters(logText);
  if (missingCharacters.length) {
    warnings.push({
      code: 'missing_glyphs',
      characters: missingCharacters
    });

    if (hasLatinFallback) {
      warnings.push({
        code: 'latin_fallback'
      });
    }

    if (!sourceProfile.usesCtex) {
      hints.push({
        code: 'configure_cjk_support'
      });
    }

    if (sourceProfile.containsCjk) {
      hints.push({
        code: 'use_installed_cjk_fonts'
      });
    }
  }

  if (sourceProfile.containsCjk && sourceProfile.usesFontspec && !sourceProfile.usesCtex) {
    hints.push({
      code: 'fontspec_not_enough_for_cjk'
    });
  }

  if (
    sourceProfile.containsCjk &&
    missingCharacters.length &&
    (sourceProfile.usesXeCJK || sourceProfile.usesLuatexja) &&
    !sourceProfile.usesCjkFontSetup
  ) {
    hints.push({
      code: 'set_cjk_font_family'
    });
  }

  for (const match of logText.matchAll(/! LaTeX Error: File `([^']+)' not found\./g)) {
    warnings.push({
      code: 'missing_package',
      packageName: match[1]
    });
  }

  if (/The fontspec package requires either XeTeX or LuaTeX\./.test(logText)) {
    recommendedEngine = recommendedEngine || 'xelatex';
    hints.push({
      code: 'fontspec_requires_unicode_engine',
      recommendedEngine
    });
  }

  const dedupe = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = JSON.stringify(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  return {
    warnings: dedupe(warnings),
    hints: dedupe(hints),
    recommendedEngine
  };
}

function buildCommandArgs(project) {
  const safeMode = project.compile_mode !== 'relaxed';
  const wallSeconds = safeMode ? config.safeWallSeconds : config.relaxedWallSeconds;
  const memoryBytes = safeMode ? config.safeMemoryBytes : config.relaxedMemoryBytes;
  const shellEscapeArg = safeMode ? '-no-shell-escape' : '-shell-escape';

  return [
    '--kill-after=5s',
    `${wallSeconds}s`,
    'prlimit',
    `--as=${memoryBytes}`,
    '--cpu=40',
    '--',
    project.engine,
    '-interaction=nonstopmode',
    '-file-line-error',
    '-halt-on-error',
    shellEscapeArg
  ];
}

function buildLatexmkArgs(project, compileOutDir, mainFile) {
  const safeMode = project.compile_mode !== 'relaxed';
  const shellEscapeArg = safeMode ? '-no-shell-escape' : '-shell-escape';

  const commandMap = {
    pdflatex: {
      engineFlag: '-pdf',
      commandOption: `-pdflatex=pdflatex -interaction=nonstopmode -file-line-error -halt-on-error ${shellEscapeArg} %O %S`
    },
    xelatex: {
      engineFlag: '-xelatex',
      commandOption: `-pdfxelatex=xelatex -interaction=nonstopmode -file-line-error -halt-on-error ${shellEscapeArg} %O %S`
    },
    lualatex: {
      engineFlag: '-lualatex',
      commandOption: `-pdflualatex=lualatex -interaction=nonstopmode -file-line-error -halt-on-error ${shellEscapeArg} %O %S`
    }
  };

  const selected = commandMap[project.engine] ?? commandMap.xelatex;
  return [
    '-norc',
    '-f',
    '-recorder',
    '-emulate-aux-dir',
    `-outdir=${compileOutDir}`,
    `-auxdir=${compileOutDir}`,
    selected.engineFlag,
    selected.commandOption,
    mainFile
  ];
}

async function compileWithLatexmk(project, compileWorkspace, compileOutDir, mainFile) {
  const safeMode = project.compile_mode !== 'relaxed';
  const wallSeconds = safeMode ? config.safeWallSeconds : config.relaxedWallSeconds;
  const memoryBytes = safeMode ? config.safeMemoryBytes : config.relaxedMemoryBytes;
  const args = [
    '--kill-after=5s',
    `${wallSeconds}s`,
    'prlimit',
    `--as=${memoryBytes}`,
    '--cpu=40',
    '--',
    'latexmk',
    ...buildLatexmkArgs(project, compileOutDir, mainFile)
  ];

  return runProcess('timeout', args, { cwd: compileWorkspace });
}

export async function compileProject(project) {
  return withCompileSlot(async () => {
    const workspaceDir = projectWorkspaceDirectory(project);
    if (!(await pathExists(workspaceDir))) {
      throw new Error('Project workspace is missing.');
    }

    if (!project.main_file) {
      throw new Error('Select a main .tex file before compiling.');
    }

    const { sanitized: mainFile } = resolveWorkspacePath(workspaceDir, project.main_file);
    const compileRoot = await fsp.mkdtemp(path.join(config.tempDir, `${project.id}-`));
    const compileWorkspace = path.join(compileRoot, 'workspace');
    const compileOutDir = path.join(compileRoot, 'out');
    const outputBaseName = path.parse(mainFile).name;
    const pdfPath = path.join(compileOutDir, `${outputBaseName}.pdf`);
    const logPath = path.join(compileOutDir, `${outputBaseName}.log`);
    let combinedOutput = '';
    let sourceProfile = {
      usesFontspec: false,
      usesCtex: false,
      usesCtexClass: false,
      usesCtexPackage: false,
      usesXeCJK: false,
      usesLuatexja: false,
      usesCjkFontSetup: false,
      usesFontawesome5: false,
      containsCjk: false
    };

    try {
      await ensureDirectory(compileWorkspace);
      await ensureDirectory(compileOutDir);
      await fsp.cp(workspaceDir, compileWorkspace, { recursive: true, force: true });
      const mainSource = await fsp.readFile(path.join(compileWorkspace, mainFile), 'utf8');
      sourceProfile = detectDocumentProfile(mainSource);

      try {
        const result = await compileWithLatexmk(project, compileWorkspace, compileOutDir, mainFile);
        combinedOutput += `${result.stdout}\n${result.stderr}\n`;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }

        const baseArgs = buildCommandArgs(project);
        const compileArgs = [...baseArgs, `-output-directory=${compileOutDir}`, mainFile];

        for (let pass = 0; pass < 2; pass += 1) {
          const result = await runProcess('timeout', compileArgs, { cwd: compileWorkspace });
          combinedOutput += `${result.stdout}\n${result.stderr}\n`;

          if (result.code !== 0 || result.signal) {
            break;
          }
        }
      }

      let logText = combinedOutput;
      if (await pathExists(logPath)) {
        logText = await fsp.readFile(logPath, 'utf8');
      }

      const analysis = analyzeCompilation(logText, project, sourceProfile);

      const previewDir = previewDirectory(project.id);
      await ensureDirectory(previewDir);

      if (await pathExists(pdfPath)) {
        await fsp.copyFile(pdfPath, path.join(previewDir, 'latest.pdf'));
        await fsp.writeFile(path.join(previewDir, 'latest.log'), clampLogText(logText), 'utf8');
        await fsp.writeFile(
          path.join(previewDir, 'latest.json'),
          JSON.stringify({
            projectId: project.id,
            mainFile,
            compiledAt: Date.now(),
            success: true
          }, null, 2),
          'utf8'
        );

        return {
          success: true,
          logText: clampLogText(logText),
          errors: extractErrors(logText),
          warnings: analysis.warnings,
          hints: analysis.hints,
          recommendedEngine: analysis.recommendedEngine,
          previewAvailable: true
        };
      }

      return {
        success: false,
        logText: clampLogText(logText),
        errors: extractErrors(logText),
        warnings: analysis.warnings,
        hints: analysis.hints,
        recommendedEngine: analysis.recommendedEngine,
        previewAvailable: await pathExists(path.join(previewDir, 'latest.pdf'))
      };
    } finally {
      await removePath(compileRoot);
    }
  });
}
