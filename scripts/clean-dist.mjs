#!/usr/bin/env node
// Removes dist/ build output.
import { rmSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const target = path.join(process.cwd(), "dist");
if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
  console.log("cleaned dist/");
} else {
  console.log("dist/ already absent");
}
