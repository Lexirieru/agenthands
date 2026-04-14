import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["directly-liberal-buzzard.ngrok-free.app"],
  experimental: {
    serverActions: {
      allowedOrigins: ["directly-liberal-buzzard.ngrok-free.app", "localhost:3000"],
    },
  },
  turbopack: {},
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
