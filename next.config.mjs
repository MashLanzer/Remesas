/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No bloquear el build de producción por warnings de lint.
    ignoreDuringBuilds: true,
  },
  // firebase-admin es solo de servidor; no debe empaquetarse en el bundle.
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
