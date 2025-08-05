/** @type {import('next').NextConfig} */
const nextConfig = {
  // No experimental flags needed for Next.js 15
  eslint: {
    // Temporarily ignore ESLint errors during builds
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig