/** @type {import('next').NextConfig} */
import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  typedRoutes: true,
}

export default varlockNextConfigPlugin()(nextConfig);
