import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dist/public");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const references = [...html.matchAll(/(?:src|href)=["'](\/?assets\/[^"']+)["']/g)]
  .map((match) => match[1]);
const manifest = JSON.parse(readFileSync(path.join(root, "asset-manifest.json"), "utf8"));

if (!html.includes('id="root"') || !references.some((reference) => reference.endsWith(".js"))) {
  throw new Error(`Missing React root or compiled JavaScript in ${root}/index.html`);
}

for (const entry of Object.values(manifest)) {
  references.push(entry.file, ...(entry.css ?? []), ...(entry.assets ?? []));
  for (const dependency of [...(entry.imports ?? []), ...(entry.dynamicImports ?? [])]) {
    if (!manifest[dependency]) {
      throw new Error(`Missing chunk manifest entry: ${dependency}`);
    }
  }
}

for (const reference of new Set(references)) {
  const asset = path.resolve(root, reference.replace(/^\//, ""));
  if (!asset.startsWith(`${root}${path.sep}`) || !existsSync(asset) || statSync(asset).size === 0) {
    throw new Error(`Missing or empty bundled asset: ${reference}`);
  }
}

console.log(`Verified index.html and ${new Set(references).size} bundled assets in ${root}`);
