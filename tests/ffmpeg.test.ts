import { describe, it, expect, vi, beforeEach } from "vitest";
import { spawnSync, execSync } from "node:child_process";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

const mockedExecSync = vi.mocked(execSync);
const mockedSpawnSync = vi.mocked(spawnSync);

describe("ffmpeg utility", () => {
  let checkFfmpeg: typeof import("../src/utils/ffmpeg.js").checkFfmpeg;
  let getVideoDuration: typeof import("../src/utils/ffmpeg.js").getVideoDuration;
  let processVideo: typeof import("../src/utils/ffmpeg.js").processVideo;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import("../src/utils/ffmpeg.js");
    checkFfmpeg = mod.checkFfmpeg;
    getVideoDuration = mod.getVideoDuration;
    processVideo = mod.processVideo;
  });

  describe("checkFfmpeg", () => {
    it("returns true when both ffmpeg and ffprobe are found", () => {
      mockedExecSync.mockReturnValue(Buffer.from("/usr/local/bin/ffmpeg"));
      expect(checkFfmpeg()).toBe(true);
      expect(mockedExecSync).toHaveBeenCalledWith("which ffmpeg", { stdio: "pipe" });
      expect(mockedExecSync).toHaveBeenCalledWith("which ffprobe", { stdio: "pipe" });
    });

    it("returns false when ffmpeg is not found", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("not found");
      });
      expect(checkFfmpeg()).toBe(false);
    });
  });

  describe("getVideoDuration", () => {
    it("returns parsed duration from ffprobe output", () => {
      mockedSpawnSync.mockReturnValue({
        stdout: Buffer.from("125.5\n"),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 0,
        output: [],
        error: undefined,
      });

      expect(getVideoDuration("/path/to/video.mp4")).toBe(125.5);
      expect(mockedSpawnSync).toHaveBeenCalledWith("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        "/path/to/video.mp4",
      ]);
    });

    it("throws when ffprobe fails", () => {
      mockedSpawnSync.mockReturnValue({
        stdout: Buffer.from(""),
        stderr: Buffer.from("error details"),
        status: 1,
        signal: null,
        pid: 0,
        output: [],
        error: undefined,
      });

      expect(() => getVideoDuration("/bad/path.mp4")).toThrow("Failed to get video duration");
    });

    it("throws when spawn errors", () => {
      mockedSpawnSync.mockReturnValue({
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        status: null,
        signal: null,
        pid: 0,
        output: [],
        error: new Error("ENOENT"),
      });

      expect(() => getVideoDuration("/any.mp4")).toThrow("Failed to get video duration");
    });
  });

  describe("processVideo", () => {
    it("calls ffmpeg with correct speed factor arguments", () => {
      mockedSpawnSync.mockReturnValue({
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 0,
        output: [],
        error: undefined,
      });

      processVideo("/input.mp4", "/output.mp4", 60);

      expect(mockedSpawnSync).toHaveBeenCalledWith(
        "ffmpeg",
        expect.arrayContaining([
          "-i", "/input.mp4",
          "-filter:v", expect.stringContaining("setpts="),
          "-an",
          "-c:v", "libx264",
          "-preset", "slow",
          "-crf", "23",
          "-y",
          "/output.mp4",
        ]),
        { stdio: "inherit" },
      );
    });

    it("throws when ffmpeg processing fails", () => {
      mockedSpawnSync.mockReturnValue({
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        status: 1,
        signal: null,
        pid: 0,
        output: [],
        error: undefined,
      });

      expect(() => processVideo("/in.mp4", "/out.mp4", 10)).toThrow("FFmpeg processing failed");
    });

    it("computes correct PTS filter for speed factor", () => {
      mockedSpawnSync.mockReturnValue({
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 0,
        output: [],
        error: undefined,
      });

      processVideo("/in.mp4", "/out.mp4", 100);

      const call = mockedSpawnSync.mock.calls[0];
      const args = call[1] as string[];
      const filterIdx = args.indexOf("-filter:v");
      const filter = args[filterIdx + 1];
      // 1/100 = 0.010000
      expect(filter).toBe("setpts=0.010000*PTS");
    });
  });
});
