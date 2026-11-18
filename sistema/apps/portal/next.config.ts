import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@t3jus/ui", "@t3jus/domain", "@t3jus/servidor"],
};

export default config;
