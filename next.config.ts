import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["read-excel-file"],
  experimental: {
    // Worksheet uploads on the public submit page exceed the 1MB Server Action
    // default, which throws a 500 before the action's try/catch runs. Raise it.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
