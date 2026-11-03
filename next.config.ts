import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  // Fonts read from disk by the generated icon and link-preview images.
  outputFileTracingIncludes: { "/**": ["./assets/fonts/*.woff"] },
};

export default nextConfig;
