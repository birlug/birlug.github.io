import assert from "node:assert/strict";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const root = new URL("../", import.meta.url);
const collection = JSON.parse(readFileSync(new URL("node_modules/@iconify-json/lucide/icons.json", root), "utf8"));
export const names = ["arrow-left", "arrow-right", "calendar-plus", "calendar-days", "images", "puzzle", "notebook-pen", "tags", "users", "heart-handshake", "search", "terminal", "map-pin", "external-link"];
export function symbol(name) {
  assert.match(name, /^[a-z0-9-]+$/);
  const icon = collection.icons[name];
  assert(icon, "Missing Lucide icon: " + name);
  assert(!/<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=/i.test(icon.body), "Active/external SVG content: " + name);
  const width = icon.width ?? collection.width ?? 24;
  const height = icon.height ?? collection.height ?? 24;
  assert(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0);
  return `<symbol id="${name}" viewBox="0 0 ${width} ${height}">${icon.body}</symbol>`;
}
export function build() {
  const license = readFileSync(new URL("static/licenses/lucide.txt", root), "utf8")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><metadata>' + license + "</metadata>" + names.map(symbol).join("") + "</svg>\n";
  const directory = new URL("assets/icons/", root);
  mkdirSync(directory, {recursive:true});
  writeFileSync(new URL("ui.svg", directory), svg);
  console.log("Built " + names.length + " local Iconify/Lucide symbols");
  return svg;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) build();
