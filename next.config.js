/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] || "Wayne-Kerr-AI-Agent";
const basePath = isGithubActions ? `/${repo}` : "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  }
};

module.exports = nextConfig;
