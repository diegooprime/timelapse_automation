import { spawnSync } from "node:child_process";

export function checkFfmpeg(): boolean {
  const ffmpeg = spawnSync("which", ["ffmpeg"], { stdio: "pipe" });
  const ffprobe = spawnSync("which", ["ffprobe"], { stdio: "pipe" });
  return !ffmpeg.error && ffmpeg.status === 0 && !ffprobe.error && ffprobe.status === 0;
}

export function getVideoDuration(videoPath: string): number {
  const result = spawnSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ]);

  if (result.error || result.status !== 0) {
    throw new Error(`Failed to get video duration: ${result.stderr?.toString()}`);
  }

  const duration = parseFloat(result.stdout.toString().trim());
  if (isNaN(duration) || duration <= 0) {
    throw new Error(`Invalid video duration: ${result.stdout.toString().trim()}`);
  }
  return duration;
}

export function processVideo(
  inputPath: string,
  outputPath: string,
  speedFactor: number
): void {
  if (!isFinite(speedFactor) || speedFactor <= 0) {
    throw new Error(`Invalid speed factor: ${speedFactor}`);
  }

  // Use setpts to speed up video, strip audio
  const ptsFilter = `setpts=${(1 / speedFactor).toFixed(6)}*PTS`;

  const args = [
    "-i",
    inputPath,
    "-filter:v",
    ptsFilter,
    "-an", // Strip audio
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "23",
    "-y", // Overwrite output
    outputPath,
  ];

  console.log(`Processing video with ${speedFactor.toFixed(2)}x speed...`);

  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });

  if (result.error || result.status !== 0) {
    throw new Error("FFmpeg processing failed");
  }
}
