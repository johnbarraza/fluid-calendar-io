/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable all development indicators
  devIndicators: {
    buildActivity: false,
    staticPageGenerationInfo: false,
  },
};

module.exports = nextConfig;
