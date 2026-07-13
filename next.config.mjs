/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "image-cdn-*.spotifycdn.com" },
      { protocol: "https", hostname: "*.scdn.co" },
    ],
  },
};

export default nextConfig;
