/**
 * @type {import("semantic-release").GlobalConfig}
 */
export default {
  branches: [
    "+([0-9])?(.{+([0-9]),x}).x",
    "master",
    "main",
    "next",
    "next-major",
    {
      name: "beta",
      prerelease: true,
    },
    {
      name: "alpha",
      prerelease: true,
    },
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@sebbo2002/semantic-release-jsr",
    ["@semantic-release/npm", {
      pkgRoot: "dist/npm",
    }],
    "@semantic-release/github",
  ],
  preset: "conventionalcommits",
};
