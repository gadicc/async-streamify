import { build, emptyDir } from "@deno/dnt";

await emptyDir("./dist/npm");

await build({
  entryPoints: ["./lib/index.ts"],
  outDir: "./dist/npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  importMap: "deno.json",

  // Too unreliable.  Do we really need them?
  // https://github.com/denoland/deno/issues/22748
  test: false,

  package: {
    // package.json properties
    name: "async-streamify",
    version: Deno.args[0],
    description:
      "Stream and serialize nested promises and async iterables over HTTP, workers, etc",
    license: "MIT",
    "keywords": [
      "async",
      "stream",
      "promise",
      "iterable",
      "asyncIterable",
      "serialize",
      "deserialize",
    ],
    "author": "Gadi Cohen <dragon@wastelands.net>",
    repository: {
      type: "git",
      url: "git+https://github.com/gadicc/async-streamify.git",
    },
    bugs: {
      url: "https://github.com/gadicc/async-streamify/issues",
    },
    "homepage": "https://github.com/gadicc/async-streamify#readme",
    devDependencies: {},
  },
  compilerOptions: {
    lib: ["ESNext"],
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE.txt", "dist/npm/LICENSE.txt");
    Deno.copyFileSync("README.md", "dist/npm/README.md");
  },
});
