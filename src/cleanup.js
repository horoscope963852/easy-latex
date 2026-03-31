import fsp from 'node:fs/promises';
import { config } from './config.js';
import { db, now } from './db.js';
import { pathExists, previewDirectory, projectRootDirectory, removePath } from './storage.js';

export async function runCleanup() {
  const currentTime = now();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(currentTime);

  const guestCutoff = currentTime - config.guestRetentionMs;
  const staleGuests = db.prepare(`
    SELECT *
    FROM projects
    WHERE owner_type = 'guest' AND updated_at < ?
  `).all(guestCutoff);

  for (const project of staleGuests) {
    await removePath(projectRootDirectory(project));
    await removePath(previewDirectory(project.id));
    db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
  }

  const knownProjects = new Set(
    db.prepare('SELECT id FROM projects').all().map((project) => project.id)
  );

  if (await pathExists(config.previewDir)) {
    const previewEntries = await fsp.readdir(config.previewDir, { withFileTypes: true });
    for (const entry of previewEntries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (knownProjects.has(entry.name)) {
        continue;
      }
      await removePath(previewDirectory(entry.name));
    }
  }
}
