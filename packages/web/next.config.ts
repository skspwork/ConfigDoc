import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  generateBuildId: async () => {
    return 'config-doc-build'
  }
};

export default nextConfig;
