import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@t3just/ui", "@t3just/domain", "@t3just/servidor"],
};

export default config;
