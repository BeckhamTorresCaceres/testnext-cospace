import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
  },
  {
    protocol: "https",
    hostname: "*.s3.*.amazonaws.com",
  },
  {
    protocol: "https",
    hostname: "*.s3.amazonaws.com",
  },
  {
    protocol: "https",
    hostname: "s3.*.amazonaws.com",
  },
  {
    protocol: "https",
    hostname: "*.cloudfront.net",
  },
];

const customS3BaseUrl =
  process.env.AWS_S3_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL;

if (customS3BaseUrl) {
  try {
    const parsed = new URL(customS3BaseUrl);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      remotePatterns.push({
        protocol: parsed.protocol.replace(":", "") as "https" | "http",
        hostname: parsed.hostname,
      });
    }
  } catch {
    // Ignorar URL inválida en compilación
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  images: {
    remotePatterns,
  },
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
