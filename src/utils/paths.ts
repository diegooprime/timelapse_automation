import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";

const ICLOUD_BASE = join(
  homedir(),
  "Library/Mobile Documents/com~apple~CloudDocs"
);

export const PATHS = {
  raw: join(ICLOUD_BASE, "timelapses-raw"),
  archive: join(ICLOUD_BASE, "timelapses"),
  downloads: join(homedir(), "Downloads"),
};

export function ensureDirectories(): void {
  if (!existsSync(PATHS.raw)) {
    mkdirSync(PATHS.raw, { recursive: true });
    console.log(`Created: ${PATHS.raw}`);
  }
  if (!existsSync(PATHS.archive)) {
    mkdirSync(PATHS.archive, { recursive: true });
    console.log(`Created: ${PATHS.archive}`);
  }
}

export function findMostRecentVideo(dir: string): string | null {
  if (!existsSync(dir)) return null;

  const files = readdirSync(dir)
    .filter((f) => /\.(mp4|mov|m4v)$/i.test(f))
    .map((f) => ({
      name: f,
      path: join(dir, f),
      mtime: statSync(join(dir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].path : null;
}

export function findTrimmedVideo(): string | null {
  // Check Downloads for recent QuickTime saves (last 30 minutes)
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

  if (existsSync(PATHS.downloads)) {
    const downloadFiles = readdirSync(PATHS.downloads)
      .filter((f) => /\.(mp4|mov|m4v)$/i.test(f))
      .map((f) => ({
        name: f,
        path: join(PATHS.downloads, f),
        mtime: statSync(join(PATHS.downloads, f)).mtime.getTime(),
      }))
      .filter((f) => f.mtime > thirtyMinutesAgo)
      .sort((a, b) => b.mtime - a.mtime);

    if (downloadFiles.length > 0) {
      return downloadFiles[0].path;
    }
  }

  // Fall back to timelapses-raw
  return findMostRecentVideo(PATHS.raw);
}

export function getNextSessionNumber(): number {
  if (!existsSync(PATHS.archive)) return 1;

  const files = readdirSync(PATHS.archive);
  const numbers = files
    .map((f) => {
      const match = f.match(/^#(\d+)\.mp4$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

export function getArchiveCount(): number {
  if (!existsSync(PATHS.archive)) return 0;
  return readdirSync(PATHS.archive).filter((f) => /^#\d+\.mp4$/.test(f)).length;
}
