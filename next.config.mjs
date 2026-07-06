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
        basePath: false,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
