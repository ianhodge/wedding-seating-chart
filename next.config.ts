import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This project is the workspace root (a stray lockfile lives in $HOME).
  turbopack: { root: __dirname },
};

export default nextConfig;
