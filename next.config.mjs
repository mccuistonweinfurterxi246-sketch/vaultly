/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/vaultly',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

