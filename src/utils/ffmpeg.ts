import { execSync, spawnSync } from "node:child_process";

export function checkFfmpeg(): boolean {
  try {
    execSync("which ffmpeg", { stdio: "pipe" });
    execSync("which ffprobe", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
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

  return parseFloat(result.stdout.toString().trim());
}

export function processVideo(
  inputPath: string,
  outputPath: string,
  speedFactor: number
): void {
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
