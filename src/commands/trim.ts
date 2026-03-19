import { spawnSync } from "node:child_process";
import { basename } from "node:path";
import { findRawVideo, PATHS, ensureDirectories } from "../utils/paths.js";

export function trim(): void {
  ensureDirectories();

  const videoPath = findRawVideo();

  if (!videoPath) {
    console.error("Error: No video found");
    console.error(`   Checked: ~/Downloads (last 2 hours) and ${PATHS.raw}`);
    process.exit(1);
  }

  console.log(`Opening: ${basename(videoPath)}`);
  console.log();

  // SECURITY: Use spawnSync to avoid command injection via videoPath
  spawnSync("open", ["-a", "iMovie"]);
  spawnSync("open", ["-R", videoPath]);

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
