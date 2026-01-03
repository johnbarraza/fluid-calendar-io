import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ["@radix-ui/react-icons"],
  },
  transpilePackages: ["react-icons"],
  // Exclude MCP submodules from build
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/google-calendar-mcp/**", "**/mcp-fitbit/**", "**/node_modules/**"],
    };
    return config;
  },
};

export default nextConfig;
