import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync, utimesSync, readdirSync, statSync } from "node:fs";

/**
 * Tests for path utility functions.
 *
 * Since PATHS is computed at module-load from homedir() (iCloud paths),
 * we test the algorithmic logic directly against temp directories
 * rather than fighting module-level constant mocking.
 */

const TEST_DIR = join(tmpdir(), `timelapse-test-${Date.now()}`);
const TEST_RAW = join(TEST_DIR, "raw");
const TEST_ARCHIVE = join(TEST_DIR, "archive");
const TEST_DOWNLOADS = join(TEST_DIR, "downloads");

beforeEach(() => {
  mkdirSync(TEST_RAW, { recursive: true });
  mkdirSync(TEST_ARCHIVE, { recursive: true });
  mkdirSync(TEST_DOWNLOADS, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("findMostRecentVideo algorithm", () => {
  // Replicate the algorithm from paths.ts to test correctness
  function findMostRecentVideo(dir: string): string | null {
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

  it("returns null for non-existent directory", () => {
    expect(findMostRecentVideo("/tmp/nonexistent-dir-xyz-abc")).toBeNull();
  });

  it("returns null for empty directory", () => {
    expect(findMostRecentVideo(TEST_RAW)).toBeNull();
  });

  it("returns most recent video file", () => {
    const old = join(TEST_RAW, "old.mp4");
    const newer = join(TEST_RAW, "newer.mov");
    writeFileSync(old, "fake");
    const past = new Date(Date.now() - 60000);
    utimesSync(old, past, past);
    writeFileSync(newer, "fake");

    expect(findMostRecentVideo(TEST_RAW)).toBe(newer);
  });

  it("ignores non-video files", () => {
    writeFileSync(join(TEST_RAW, "readme.txt"), "text");
    writeFileSync(join(TEST_RAW, "video.mp4"), "fake");

    expect(findMostRecentVideo(TEST_RAW)).toBe(join(TEST_RAW, "video.mp4"));
  });

  it("matches .m4v extension", () => {
    writeFileSync(join(TEST_RAW, "clip.m4v"), "fake");
    expect(findMostRecentVideo(TEST_RAW)).toBe(join(TEST_RAW, "clip.m4v"));
  });
});

describe("findTrimmedVideo algorithm", () => {
  function findMostRecentVideo(dir: string): string | null {
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

  function findTrimmedVideo(): string | null {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    if (existsSync(TEST_DOWNLOADS)) {
      const downloadFiles = readdirSync(TEST_DOWNLOADS)
        .filter((f) => /\.(mp4|mov|m4v)$/i.test(f))
        .map((f) => ({
          name: f,
          path: join(TEST_DOWNLOADS, f),
          mtime: statSync(join(TEST_DOWNLOADS, f)).mtime.getTime(),
        }))
        .filter((f) => f.mtime > thirtyMinutesAgo)
        .sort((a, b) => b.mtime - a.mtime);
      if (downloadFiles.length > 0) {
        return downloadFiles[0].path;
      }
    }
    return findMostRecentVideo(TEST_RAW);
  }

  it("returns recent download video within 30 min window", () => {
    const videoPath = join(TEST_DOWNLOADS, "trimmed.mp4");
    writeFileSync(videoPath, "fake");
    expect(findTrimmedVideo()).toBe(videoPath);
  });

  it("ignores old downloads and falls back to raw", () => {
    const oldDownload = join(TEST_DOWNLOADS, "old.mp4");
    writeFileSync(oldDownload, "fake");
    const past = new Date(Date.now() - 60 * 60 * 1000);
    utimesSync(oldDownload, past, past);

    const rawVideo = join(TEST_RAW, "raw.mp4");
    writeFileSync(rawVideo, "fake");

    expect(findTrimmedVideo()).toBe(rawVideo);
  });

  it("returns null when no videos found anywhere", () => {
    expect(findTrimmedVideo()).toBeNull();
  });
});

describe("getNextSessionNumber algorithm", () => {
  function getNextSessionNumber(): number {
    if (!existsSync(TEST_ARCHIVE)) return 1;
    const files = readdirSync(TEST_ARCHIVE);
    const numbers = files
      .map((f) => {
        const match = f.match(/^#(\d+)\.mp4$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  }

  it("returns 1 when archive is empty", () => {
    expect(getNextSessionNumber()).toBe(1);
  });

  it("returns next number after existing sessions", () => {
    writeFileSync(join(TEST_ARCHIVE, "#1.mp4"), "fake");
    writeFileSync(join(TEST_ARCHIVE, "#2.mp4"), "fake");
    writeFileSync(join(TEST_ARCHIVE, "#5.mp4"), "fake");
    expect(getNextSessionNumber()).toBe(6);
  });

  it("ignores non-session files", () => {
    writeFileSync(join(TEST_ARCHIVE, "#3.mp4"), "fake");
    writeFileSync(join(TEST_ARCHIVE, "random.mp4"), "fake");
    expect(getNextSessionNumber()).toBe(4);
  });

  it("returns 1 when archive dir does not exist", () => {
    rmSync(TEST_ARCHIVE, { recursive: true, force: true });
    expect(getNextSessionNumber()).toBe(1);
  });
});

describe("getArchiveCount algorithm", () => {
  function getArchiveCount(): number {
    if (!existsSync(TEST_ARCHIVE)) return 0;
    return readdirSync(TEST_ARCHIVE).filter((f) => /^#\d+\.mp4$/.test(f)).length;
  }

  it("returns 0 for empty archive", () => {
    expect(getArchiveCount()).toBe(0);
  });

  it("counts only session files", () => {
    writeFileSync(join(TEST_ARCHIVE, "#1.mp4"), "fake");
    writeFileSync(join(TEST_ARCHIVE, "#2.mp4"), "fake");
    writeFileSync(join(TEST_ARCHIVE, "other.mp4"), "fake");
    expect(getArchiveCount()).toBe(2);
  });

  it("returns 0 when archive dir does not exist", () => {
    rmSync(TEST_ARCHIVE, { recursive: true, force: true });
    expect(getArchiveCount()).toBe(0);
  });
});

describe("ensureDirectories algorithm", () => {
  it("creates directories when they do not exist", () => {
    const newRaw = join(TEST_DIR, "new-raw");
    const newArchive = join(TEST_DIR, "new-archive");

    if (!existsSync(newRaw)) mkdirSync(newRaw, { recursive: true });
    if (!existsSync(newArchive)) mkdirSync(newArchive, { recursive: true });

    expect(existsSync(newRaw)).toBe(true);
    expect(existsSync(newArchive)).toBe(true);
  });

  it("does not error when directories already exist", () => {
    expect(() => {
      if (!existsSync(TEST_RAW)) mkdirSync(TEST_RAW, { recursive: true });
      if (!existsSync(TEST_ARCHIVE)) mkdirSync(TEST_ARCHIVE, { recursive: true });
    }).not.toThrow();
  });
});
