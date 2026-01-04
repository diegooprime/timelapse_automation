import { execSync } from "node:child_process";
import { basename } from "node:path";
import { findMostRecentVideo, PATHS, ensureDirectories } from "../utils/paths.js";

export function trim(): void {
  ensureDirectories();

  const videoPath = findMostRecentVideo(PATHS.raw);

  if (!videoPath) {
    console.error("Error: No video found in timelapses-raw folder");
    console.error(`   Path: ${PATHS.raw}`);
    process.exit(1);
  }

  console.log(`Opening: ${basename(videoPath)}`);
  console.log();

  // Open iMovie and reveal file in Finder
  execSync(`open -a "iMovie"`);
  execSync(`open -R "${videoPath}"`);

  console.log("Edit in iMovie:");
  console.log("   1. Create new Movie project");
  console.log("   2. Drag the file from Finder into iMovie");
  console.log("   3. Drag to timeline, cut sections with Cmd+B, delete unwanted parts");
  console.log("   4. File → Share → File → Export to Downloads");
  console.log();
  console.log("Then run:");
  console.log("   tl process <hours>");
  console.log();
  console.log("   Example: tl process 4.5  (for 4.5 hours of work)");
  console.log();
}
