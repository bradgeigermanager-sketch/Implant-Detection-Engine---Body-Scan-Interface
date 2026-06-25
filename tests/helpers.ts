import fs from "fs";
import path from "path";

export function loadJson(relativePath: string): any {
  const fullPath = path.join(process.cwd(), relativePath);
  const raw = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(raw);
}

export function normalize(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
