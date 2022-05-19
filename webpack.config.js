const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const webpack = require('webpack');

function createModule(name, entry, isDev) {
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
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
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
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
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
        }
      ]
    },
    plugins: [
      new webpack.EnvironmentPlugin({
        NODE_ENV: 'production',
        PERF_BUILD: ''
      }),
      new CopyPlugin({
        patterns: [
          { from: 'public', to: '.' },
        ]
      }),
      ...(isDev ? [] : [new MiniCssExtractPlugin()]),
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
      minimize: false,
      runtimeChunk: isDev ? 'single': undefined,
    },
    devServer: isDev ? {
      static: './dist',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      }
    } : undefined,
  };
}

module.exports = [
  createModule('prod', {
    background: './src/background.ts',
    'server-worker': './src/server/worker.ts',
    'content-script': './src/content-script.ts',
    client: './src/client/extension.tsx',
  }),
  createModule('dev', {
    'web-client': './src/client/web.tsx',
  })
];
