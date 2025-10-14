const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  webpack: {
    plugins: {
      add: [new BundleAnalyzerPlugin({ analyzerMode: 'json', reportFilename: 'report.json' })],
    },
  },
};