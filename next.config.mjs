/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No bloquear el build de producción por warnings de lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
