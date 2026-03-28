import { copyFileSync, unlinkSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import {
  findTrimmedVideo,
  findMostRecentVideo,
  getNextSessionNumber,
  PATHS,
  ensureDirectories,
} from "../utils/paths.js";
import { checkFfmpeg, getVideoDuration, processVideo } from "../utils/ffmpeg.js";
import { getVercelToken, uploadToVercel } from "../utils/upload.js";

export async function processTimelapse(hours: number): Promise<void> {
  ensureDirectories();

  // Validate hours
  if (!isFinite(hours) || hours <= 0) {
    console.error("Error: Please provide valid hours (e.g., tl process 4.5)");
    process.exit(1);
  }

  // Check ffmpeg
  if (!checkFfmpeg()) {
    console.error("Error: ffmpeg not found. Install with: brew install ffmpeg");
    process.exit(1);
  }

  // Find the trimmed video
  const inputPath = findTrimmedVideo();
  if (!inputPath) {
    console.error("Error: No video found");
    console.error("   Checked Downloads (last 30 min) and timelapses-raw");
    process.exit(1);
  }

  console.log(`\nProcessing: ${basename(inputPath)}`);

  // Get duration and calculate speed
  const durationSec = getVideoDuration(inputPath);
  const targetDurationSec = hours * 1; // 1 second per hour
  const speedFactor = durationSec / targetDurationSec;

  console.log(`   Duration: ${formatDuration(durationSec)}`);
  console.log(`   Target: ${hours}s (1s per hour worked)`);
  console.log(`   Speed: ${speedFactor.toFixed(1)}x`);
  console.log();

  // Determine session number
  const sessionNum = getNextSessionNumber();
  const archiveName = `#${sessionNum}.mp4`;
  const blobName = `#${sessionNum}-${hours}h.mp4`;

  // Process video to temp file
  const tempOutput = join(tmpdir(), `timelapse-${Date.now()}.mp4`);

  try {
    processVideo(inputPath, tempOutput, speedFactor);

    // Copy to archive
    const archivePath = join(PATHS.archive, archiveName);
    copyFileSync(tempOutput, archivePath);
    console.log(`\nSaved to archive: ${archiveName}`);

    // Upload to Vercel
    const token = getVercelToken();
    let blobUrl: string | null = null;

    if (token) {
      try {
        console.log(`Uploading to Vercel Blob...`);
        blobUrl = await uploadToVercel(tempOutput, blobName);
        console.log(`Uploaded: ${blobName}`);

        // SECURITY: Use spawnSync to avoid command injection via blobUrl
        spawnSync("pbcopy", [], { input: blobUrl, stdio: ["pipe", "inherit", "inherit"] });
        console.log(`URL copied to clipboard`);
      } catch (err) {
        console.error(`\nUpload failed: ${err instanceof Error ? err.message : err}`);
        console.log("   Video saved locally. Raw file preserved.");
      }
    } else {
      console.log(`\nNo Vercel token. Skipping upload.`);
      console.log("   Set BLOB_READ_WRITE_TOKEN to enable uploads.");
    }

    // Delete source files only if upload succeeded or we don't have a token
    if (blobUrl || !token) {
      // Delete the input file (trimmed video from Downloads)
      if (existsSync(inputPath)) {
        unlinkSync(inputPath);
        console.log(`Deleted: ${basename(inputPath)}`);
      }

      // Also delete raw file from timelapses-raw if it exists
      const rawFile = findMostRecentVideo(PATHS.raw);
      if (rawFile) {
        unlinkSync(rawFile);
        console.log(`Deleted raw: ${basename(rawFile)}`);
      }
    }

    // Summary
    console.log(`\nSession #${sessionNum} complete!`);
    if (blobUrl) {
      console.log(`   ${blobUrl}`);
    }
    console.log();

  } finally {
    // Clean up temp file
    if (existsSync(tempOutput)) {
      unlinkSync(tempOutput);
    }
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 60) {
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}
