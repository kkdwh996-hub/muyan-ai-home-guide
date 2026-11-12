import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(root, "public");
const outputDir = join(root, "dist");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(publicDir, outputDir, { recursive: true });
await cp(
  join(root, "lib", "engine.mjs"),
  join(outputDir, "engine.js")
);

const indexPath = join(outputDir, "index.html");
const source = await readFile(indexPath, "utf8");
const staticHtml = source.replace(
  '<html lang="zh-CN">',
  '<html lang="zh-CN" data-static-app="true">'
);
if (staticHtml === source) {
  throw new Error("Could not enable static mode in index.html");
}
await writeFile(indexPath, staticHtml, "utf8");
await writeFile(join(outputDir, ".nojekyll"), "", "utf8");

console.log(`Static site built at ${outputDir}`);
