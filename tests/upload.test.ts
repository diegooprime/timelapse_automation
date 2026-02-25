import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-video-data")),
  };
});

describe("upload utility", () => {
  let getVercelToken: typeof import("../src/utils/upload.js").getVercelToken;
  let uploadToVercel: typeof import("../src/utils/upload.js").uploadToVercel;

  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv };
    const mod = await import("../src/utils/upload.js");
    getVercelToken = mod.getVercelToken;
    uploadToVercel = mod.uploadToVercel;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getVercelToken", () => {
    it("returns token from environment", () => {
      process.env.BLOB_READ_WRITE_TOKEN = "test-token-123";
      expect(getVercelToken()).toBe("test-token-123");
    });

    it("returns null when token is not set", () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      expect(getVercelToken()).toBeNull();
    });
  });

  describe("uploadToVercel", () => {
    it("uploads file and returns URL", async () => {
      process.env.BLOB_READ_WRITE_TOKEN = "test-token";
      const { put } = await import("@vercel/blob");
      const mockedPut = vi.mocked(put);
      mockedPut.mockResolvedValue({
        url: "https://blob.vercel-storage.com/test.mp4",
        downloadUrl: "https://blob.vercel-storage.com/test.mp4",
        pathname: "test.mp4",
        contentType: "video/mp4",
        contentDisposition: "",
      });

      // Re-import to get fresh module with new env
      vi.resetModules();
      const mod = await import("../src/utils/upload.js");
      const result = await mod.uploadToVercel("/tmp/video.mp4", "test.mp4");

      expect(result).toBe("https://blob.vercel-storage.com/test.mp4");
      expect(mockedPut).toHaveBeenCalledWith(
        "test.mp4",
        expect.any(Buffer),
        { access: "public", addRandomSuffix: false, token: "test-token" },
      );
    });

    it("throws when token is not set", async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      vi.resetModules();
      const mod = await import("../src/utils/upload.js");

      await expect(mod.uploadToVercel("/tmp/v.mp4", "v.mp4")).rejects.toThrow(
        "BLOB_READ_WRITE_TOKEN not set",
      );
    });
  });
});
