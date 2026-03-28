import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

vi.mock("../src/utils/paths.js", () => ({
  findRawVideo: vi.fn(),
  PATHS: { raw: "/tmp/test-raw", archive: "/tmp/test-archive", downloads: "/tmp/test-dl" },
  ensureDirectories: vi.fn(),
}));

describe("trim command", () => {
  let trim: typeof import("../src/commands/trim.js").trim;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock("node:child_process", () => ({
      spawnSync: vi.fn(),
    }));

    vi.doMock("../src/utils/paths.js", () => ({
      findRawVideo: vi.fn().mockReturnValue("/tmp/test-raw/video.mp4"),
      PATHS: { raw: "/tmp/test-raw", archive: "/tmp/test-archive", downloads: "/tmp/test-dl" },
      ensureDirectories: vi.fn(),
    }));

    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    const mod = await import("../src/commands/trim.js");
    trim = mod.trim;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("opens iMovie and reveals file when video exists", async () => {
    trim();

    const { spawnSync } = await import("node:child_process");
    expect(spawnSync).toHaveBeenCalledWith("open", ["-a", "iMovie"]);
    expect(spawnSync).toHaveBeenCalledWith("open", ["-R", "--", "/tmp/test-raw/video.mp4"]);
  });

  it("exits when no video found", async () => {
    const paths = await import("../src/utils/paths.js");
    vi.mocked(paths.findRawVideo).mockReturnValue(null);

    expect(() => trim()).toThrow("process.exit(1)");
  });

  it("shows usage instructions", () => {
    trim();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("tl process"));
  });
});
