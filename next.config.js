/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const vercelUrl = process.env.VERCEL_URL;

    // Avoid infinite routing loops if NEXT_PUBLIC_API_URL points back to this exact Vercel deployment
    if (
      apiUrl &&
      (apiUrl.startsWith('/api') ||
        (vercelUrl && apiUrl.includes(vercelUrl)) ||
        apiUrl.includes('bar-pearl-seven.vercel.app'))
    ) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl || 'http://localhost:5000/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
