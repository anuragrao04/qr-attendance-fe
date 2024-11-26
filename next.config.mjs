/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://attendance.anuragrao.site/api/:path*"
      }
    ]
  }
};

export default nextConfig;
