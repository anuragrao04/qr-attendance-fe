/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://staging.attendance.anuragrao.site/api/:path*"
      }
    ]
  }
};

export default nextConfig;
