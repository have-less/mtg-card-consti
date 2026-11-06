import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

/** Stream a .jsonl or .jsonl.gz file one parsed object at a time. */
export async function* readJsonl<T>(path: string): AsyncGenerator<T> {
  let input: NodeJS.ReadableStream = createReadStream(path);
  if (path.endsWith(".gz")) input = input.pipe(createGunzip());
  const rl = createInterface({ input, crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    n++;
    const s = line.trim();
    if (!s) continue;
    try {
      yield JSON.parse(s) as T;
    } catch (e) {
      throw new Error(`${path}: bad JSON on line ${n}: ${(e as Error).message}`);
    }
  }
}
