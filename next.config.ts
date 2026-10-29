import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
  },
  async rewrites() {
    return {
      // Only used when the file isn't found in /public — i.e. images uploaded
      // from the admin panel after the production build (see api/uploads).
      fallback: [{ source: "/images/uploads/:path*", destination: "/api/uploads/:path*" }],
    };
  },
};

export default nextConfig;