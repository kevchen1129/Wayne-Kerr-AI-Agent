/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] || "Wayne-Kerr-AI-Agent";
const explicitBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath =
  explicitBasePath && explicitBasePath.length > 0
    ? explicitBasePath
    : isGithubActions
      ? `/${repo}`
      : "";

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
