const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.ts',
    'server-worker': './src/server/worker.ts',
    'content-script': './src/content-script.ts',
    'client': './src/client/index.tsx',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true
            }
          }
        ],
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
    extensions: ['.tsx', '.ts', '.js', '.css'],
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
  },
  optimization: {
    minimize: false
  }
};
