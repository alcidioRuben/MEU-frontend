const webpack = require('webpack');
const { override, addWebpackResolve, addWebpackPlugin } = require('customize-cra');

module.exports = override(
  addWebpackResolve({
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
      process: require.resolve('process/browser'),
      vm: false
    },
    extensions: ['.js', '.jsx', '.mjs', '.json']
  }),
  addWebpackPlugin(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
      crypto: 'crypto-browserify'
    })
  ),
  (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      process: 'process/browser',
      crypto: 'crypto-browserify'
    };
    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false
      }
    });
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Failed to parse source map/,
    ];
    return config;
  }
);