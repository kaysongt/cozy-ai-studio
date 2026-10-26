import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard is opened at 127.0.0.1. Without this, Next blocks the dev
  // HMR socket and the client bundle never hydrates.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Live floor data is request-time. Cache Components would freeze the dashboard shell.
  serverExternalPackages: ["pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
