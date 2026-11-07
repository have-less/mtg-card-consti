import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";

const DATA_DIR = "data/out";
const DATA_FILES = ["graph.json", "cards.json"];

/** The viewer fetches /data/out/*.json; dev serves them from the repo, builds must ship them. */
function copyData(): Plugin {
  let outDir = "dist";
  return {
    name: "copy-prep-data",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const missing = DATA_FILES.filter((f) => !existsSync(join(DATA_DIR, f)));
      if (missing.length) throw new Error(`Missing ${missing.map((f) => join(DATA_DIR, f)).join(", ")}. Run npm run prep first.`);
      await mkdir(join(outDir, DATA_DIR), { recursive: true });
      for (const f of DATA_FILES) await copyFile(join(DATA_DIR, f), join(outDir, DATA_DIR, f));
    },
  };
}

export default defineConfig({
  plugins: [copyData()],
});
