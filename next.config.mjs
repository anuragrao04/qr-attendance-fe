/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // destination: "https://attendance.anuragrao.site/api/:path*"
        destination: "http://localhost:6969/:path",
      },
    ];
  },
};

export default nextConfig;
