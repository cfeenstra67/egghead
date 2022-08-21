const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// Hack to avoid issues in a service worker
// See https://github.com/webpack/webpack/blob/main/lib/web/JsonpChunkLoadingRuntimeModule.js
webpack.web.JsonpChunkLoadingRuntimeModule.prototype._generateBaseUri = (chunk) => {
  const options = chunk.getEntryOptions();
  if (options && options.baseUri) {
    return `${webpack.RuntimeGlobals.baseURI} = ${JSON.stringify(options.baseUri)};`;
  } else {
    return `${webpack.RuntimeGlobals.baseURI} = typeof document === "undefined" ? self.location.href : document.baseURI || self.location.href;`;
  }
}

function createModule({
  name,
  logLevel,
  entry,
  devMode,
  ignoreAssets,
  platform,
}) {
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
        PERF_BUILD: '',
      }),
      new webpack.DefinePlugin({
        LOG_LEVEL: JSON.stringify(logLevel),
        DEV_MODE: JSON.stringify(!!devMode),
      }),
      new CopyPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ignoreAssets ?? [],
            }
          },
          {
            from: `data/${name}`,
            to: '.',
            noErrorOnMissing: platform !== 'web'
          },
          {
            from: `manifests/${platform}.json`,
            to: 'manifest.json',
            noErrorOnMissing: platform === 'web',
          }
        ],
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
  createModule({
    name: 'chrome',
    logLevel: 'error',
    ignoreAssets: ['**/sql-wasm.wasm', '**/demo-history.html'],
    entry: {
      background: './src/background.ts',
      'content-script': './src/content-script.ts',
      client: './src/client/chrome.tsx',
      popup: './src/client/chrome-popup.tsx',
    },
    platform: 'chrome',
  }),
  createModule({
    name: 'firefox',
    logLevel: 'error',
    ignoreAssets: ['**/sql-wasm.wasm', '**/demo-history.html'],
    entry: {
      background: './src/background.ts',
      'content-script': './src/content-script.ts',
      client: './src/client/firefox.tsx',
      popup: './src/client/firefox-popup.tsx',
    },
    platform: 'firefox',
  }),
  createModule({
    name: 'dev-chrome',
    logLevel: 'debug',
    devMode: true,
    ignoreAssets: ['**/sql-wasm.wasm', '**/demo-history.html'],
    entry: {
      background: './src/background.ts',
      'content-script': './src/content-script.ts',
      client: './src/client/chrome.tsx',
      popup: './src/client/chrome-popup.tsx',
    },
    platform: 'chrome'
  }),
  createModule({
    name: 'demo',
    logLevel: 'error',
    ignoreAssets: ['**/*.png', '**/history.html'],
    entry: {
      client: './src/client/demo.tsx',
      popup: './src/client/demo-popup.tsx',
    },
    platform: 'web',
  }),
  createModule({
    name: 'dev',
    logLevel: 'debug',
    devMode: true,
    ignoreAssets: ['**/demo-history.html'],
    entry: {
      client: './src/client/web.tsx',
      popup: './src/client/web-popup.tsx',
    },
    platform: 'web',
  }),
];
