const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.ts',
    'server-worker': './src/server/worker.ts',
    'content-script': './src/content-script.ts',
    'client-bootstrap': './src/client-bootstrap.ts',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      PERF_BUILD: ''
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      fs: false,
      path: false,
      os: false,
      crypto: false,
    }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  }
};
