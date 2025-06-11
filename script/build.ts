import { barelyServe } from "barely-a-dev-server";

await barelyServe({
  dev: false,
  entryRoot: "./src",
  outDir: "./dist/web/garron.net/dance/bpm/",
  esbuildOptions: {
    minify: false,
  },
});
