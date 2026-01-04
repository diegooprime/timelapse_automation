import { existsSync, readdirSync, statSync } from "node:fs";
import { PATHS, getArchiveCount } from "../utils/paths.js";
import { checkFfmpeg } from "../utils/ffmpeg.js";
import { getVercelToken } from "../utils/upload.js";

export function status(): void {
  console.log("\nTimelapse Status\n");

  // Check archive
  const count = getArchiveCount();
  console.log(`Archive: ${count} timelapse${count !== 1 ? "s" : ""}`);

  if (existsSync(PATHS.archive)) {
    const files = readdirSync(PATHS.archive)
      .filter((f) => /^#\d+\.mp4$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/^#(\d+)/)?.[1] ?? "0", 10);
        const numB = parseInt(b.match(/^#(\d+)/)?.[1] ?? "0", 10);
        return numB - numA;
      });

    if (files.length > 0) {
      const latest = files[0];
      const stat = statSync(`${PATHS.archive}/${latest}`);
      console.log(`Latest: ${latest} (${formatDate(stat.mtime)})`);
    }
  }

  // Check raw folder
  if (existsSync(PATHS.raw)) {
    const rawFiles = readdirSync(PATHS.raw).filter((f) =>
      /\.(mp4|mov|m4v)$/i.test(f)
    );
    if (rawFiles.length > 0) {
      console.log(`\nPending: ${rawFiles.length} video${rawFiles.length !== 1 ? "s" : ""} in raw folder`);
    }
  }

  // Check dependencies
  console.log("\nDependencies\n");

  const hasFfmpeg = checkFfmpeg();
  console.log(`ffmpeg: ${hasFfmpeg ? "✓ installed" : "✗ missing (brew install ffmpeg)"}`);

  const hasToken = !!getVercelToken();
  console.log(`Vercel token: ${hasToken ? "✓ configured" : "✗ missing (set BLOB_READ_WRITE_TOKEN)"}`);

  console.log("\nPaths\n");
  console.log(`Raw: ${PATHS.raw}`);
  console.log(`Archive: ${PATHS.archive}`);
  console.log();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
