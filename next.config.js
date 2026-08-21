/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
  serverExternalPackages: ['sequelize', 'sqlite3', 'bcrypt', 'sharp'],
  images: {
    formats: ['image/webp'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    config.module.rules.push({
      test: /\.mjs$/,
      enforce: 'pre',
      use: ['source-map-loader'],
    });

    config.ignoreWarnings = [...(config.ignoreWarnings ?? []), /Failed to parse source map/];

    return config;
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
