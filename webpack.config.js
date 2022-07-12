const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const webpack = require('webpack');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

function createModule(name, entry) {
  return {
    mode: 'production',
    name,
    entry,
    devtool: 'inline-source-map',
    target: 'web',
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
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: '[name]__[local]--[hash:base64:5]'
                },
              }
            }
          ],
          include: /\.module\.css$/
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader'
          ],
          exclude: /\.module\.css$/
        },
        {
          test: /\.svg$/,
          issuer: /\.[jt]sx?$/,
          use: ['@svgr/webpack'],
        },
        {
          test: /\.svg$/,
          issuer: /\.css?$/,
          type: 'asset',
        },
        {
          test: /\.db$/,
          type: 'asset/inline',
          generator: {
            dataUrl: (content) => content.toString('base64')
          }
        },
        {
          test: /\.txt$/i,
          type: 'asset/inline',
          generator: {
            dataUrl: (content) => content.toString()
          }
        },
      ]
    },
    plugins: [
      new webpack.EnvironmentPlugin({
        NODE_ENV: 'production',
        PERF_BUILD: ''
      }),
      new CopyPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            filter: (resourcePath) => {
              const isDemo = name === 'demo';
              const demoIgnore = ['popup.html', 'manifest.json'];
              const nonDemoIgnore = ['history.db'];
              const baseName = path.basename(resourcePath);
              if (isDemo && demoIgnore.includes(baseName)) {
                return false;
              }
              if (!isDemo && nonDemoIgnore.includes(baseName)) {
                return false;
              }
              return true;
            }
          },
        ]
      }),
      new MiniCssExtractPlugin(),
      // Enable for analysis when necessary
      // new BundleAnalyzerPlugin(),
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
      path: path.resolve(__dirname, 'dist', name),
    },
    optimization: {
      minimize: false,
    },
  };
}

module.exports = [
  createModule('prod', {
    background: './src/background.ts',
    'server-worker': './src/server/worker.ts',
    'content-script': './src/content-script.ts',
    client: './src/client/extension.tsx',
    popup: './src/client/extension-popup.tsx',
  }),
  createModule('demo', {
    client: './src/client/demo.tsx',
  }),
  createModule('dev', {
    client: './src/client/web.tsx',
    popup: './src/client/web-popup.tsx',
  }),
];
