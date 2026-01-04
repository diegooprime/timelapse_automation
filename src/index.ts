#!/usr/bin/env node

import { Command } from "commander";
import { status } from "./commands/status.js";
import { trim } from "./commands/trim.js";
import { processTimelapse } from "./commands/process.js";

const program = new Command();

program
  .name("tl")
  .description("Timelapse automation CLI")
  .version("1.0.0");

program
  .command("status")
  .description("Show timelapse archive status and check dependencies")
  .action(status);

program
  .command("trim")
  .description("Open most recent raw video in QuickTime for trimming")
  .action(trim);

program
  .command("process <hours>")
  .description("Process trimmed video: speed up, compress, upload")
  .action(async (hoursStr: string) => {
    const hours = parseFloat(hoursStr);
    await processTimelapse(hours);
  });

program.parse();
