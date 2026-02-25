import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEST_DIR = join(tmpdir(), `timelapse-status-test-${Date.now()}`);
const TEST_RAW = join(TEST_DIR, "raw");
const TEST_ARCHIVE = join(TEST_DIR, "archive");

beforeEach(() => {
  mkdirSync(TEST_RAW, { recursive: true });
  mkdirSync(TEST_ARCHIVE, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

vi.mock("../src/utils/paths.js", () => ({
  PATHS: {
    raw: TEST_RAW,
    archive: TEST_ARCHIVE,
    downloads: join(TEST_DIR, "downloads"),
  },
  getArchiveCount: vi.fn().mockReturnValue(0),
  ensureDirectories: vi.fn(),
  findMostRecentVideo: vi.fn(),
  findTrimmedVideo: vi.fn(),
  getNextSessionNumber: vi.fn(),
}));

vi.mock("../src/utils/ffmpeg.js", () => ({
  checkFfmpeg: vi.fn().mockReturnValue(true),
}));

vi.mock("../src/utils/upload.js", () => ({
  getVercelToken: vi.fn().mockReturnValue("test-token"),
}));

describe("status command", () => {
  let status: typeof import("../src/commands/status.js").status;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("../src/utils/paths.js", () => ({
      PATHS: {
        raw: TEST_RAW,
        archive: TEST_ARCHIVE,
        downloads: join(TEST_DIR, "downloads"),
      },
      getArchiveCount: vi.fn().mockReturnValue(0),
      ensureDirectories: vi.fn(),
      findMostRecentVideo: vi.fn(),
      findTrimmedVideo: vi.fn(),
      getNextSessionNumber: vi.fn(),
    }));

    vi.doMock("../src/utils/ffmpeg.js", () => ({
      checkFfmpeg: vi.fn().mockReturnValue(true),
    }));

    vi.doMock("../src/utils/upload.js", () => ({
      getVercelToken: vi.fn().mockReturnValue("test-token"),
    }));

    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mod = await import("../src/commands/status.js");
    status = mod.status;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("reports archive count", () => {
    status();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Archive:"));
  });

  it("reports ffmpeg status", () => {
    status();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("ffmpeg:"));
  });

  it("reports vercel token status", () => {
    status();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Vercel token:"));
  });

  it("shows latest session when archive has files", () => {
    writeFileSync(join(TEST_ARCHIVE, "#1.mp4"), "fake");
    writeFileSync(join(TEST_ARCHIVE, "#2.mp4"), "fake");

    status();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Latest:"));
  });

  it("shows pending videos in raw folder", () => {
    writeFileSync(join(TEST_RAW, "recording.mp4"), "fake");

    status();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Pending:"));
  });

  it("shows paths", () => {
    status();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Raw:"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Archive:"));
  });
});
