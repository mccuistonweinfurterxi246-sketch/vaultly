/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/vaultly',
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/vaultly',
        permanent: true,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
