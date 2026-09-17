// Checks that every relative link in the Markdown docs still points at a file that exists,
// so docs/architecture.md cannot drift away from the code it maps. Run by CI on each pull request.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<img[^>]*\ssrc="([^"]+)"/g;
const HEADING = /^#{1,6}\s+(.+?)\s*$/gm;

/** GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens. */
function slug(heading) {
  return heading
    .replace(/`|\*|_/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function markdownFiles() {
  const files = readdirSync(root).filter((name) => name.endsWith(".md"));
  const docs = readdirSync(join(root, "docs")).filter((name) => name.endsWith(".md"));
  return [...files, ...docs.map((name) => posix.join("docs", name))];
}

const problems = [];

for (const file of markdownFiles()) {
  const text = readFileSync(join(root, file), "utf8");
  for (const match of text.matchAll(LINK)) {
    const target = match[1] ?? match[2];
    if (/^(https?:|mailto:|#)/.test(target)) continue;

    const [path, anchor] = decodeURI(target).split("#");
    const full = resolve(root, dirname(file), path);
    if (!existsSync(full)) {
      problems.push(`${file}: ${target} -> missing ${relative(root, full)}`);
      continue;
    }
    if (!anchor || !path.endsWith(".md") || statSync(full).isDirectory()) continue;

    const headings = [...readFileSync(full, "utf8").matchAll(HEADING)].map((h) => slug(h[1]));
    if (!headings.includes(anchor)) problems.push(`${file}: ${target} -> no heading "${anchor}"`);
  }
}

if (problems.length > 0) {
  console.error(`Broken documentation links (${problems.length}):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("Documentation links are all good.");
