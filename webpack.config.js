import path from "node:path";
import url from "node:url";
import CopyPlugin from "copy-webpack-plugin";
import MergeJsonWebpackPlugin from "merge-jsons-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import webpack from "webpack";
// const CopyPlugin = require("copy-webpack-plugin");
// const MergeJsonWebpackPlugin = require("merge-jsons-webpack-plugin");
// const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// const path = require("node:path");
// const webpack = require("webpack");
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Hack to avoid issues in a service worker
// See https://github.com/webpack/webpack/blob/main/lib/web/JsonpChunkLoadingRuntimeModule.js
webpack.web.JsonpChunkLoadingRuntimeModule.prototype._generateBaseUri = (
  chunk,
) => {
  const options = chunk.getEntryOptions();
  if (options?.baseUri) {
    return `${webpack.RuntimeGlobals.baseURI} = ${JSON.stringify(options.baseUri)};`;
  }
  return `${webpack.RuntimeGlobals.baseURI} = typeof document === "undefined" ? self.location.href : document.baseURI || self.location.href;`;
};

function createModule({
  name,
  logLevel,
  entry,
  devMode,
  ignoreAssets,
  platform,
  manifest,
}) {
  return {
    mode: "production",
    name,
    entry,
    devtool: devMode ? "inline-source-map" : false,
    target: "web",
    devServer: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                modules: {
                  localIdentName: "[name]__[local]--[hash:base64:5]",
                },
              },
            },
            "postcss-loader",
          ],
          include: /\.module\.css$/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
          exclude: /\.module\.css$/,
        },
        {
          test: /\.svg$/,
          issuer: /\.[jt]sx?$/,
          use: ["@svgr/webpack"],
        },
        {
          test: /\.svg$/,
          issuer: /\.css?$/,
          type: "asset",
        },
        {
          test: /\.txt$/i,
          type: "asset/inline",
          generator: {
            dataUrl: (content) => content.toString(),
          },
        },
      ],
    },
    plugins: [
      new webpack.EnvironmentPlugin({
        NODE_ENV: "production",
        PERF_BUILD: "",
      }),
      new webpack.DefinePlugin({
        LOG_LEVEL: JSON.stringify(logLevel),
        DEV_MODE: JSON.stringify(!!devMode),
        PLATFORM: JSON.stringify(platform),
        global: "globalThis",
      }),
      new CopyPlugin({
        patterns: [
          {
            from: "public",
            to: ".",
            globOptions: {
              ignore: ignoreAssets ?? [],
            },
          },
          {
            from: `data/${name}`,
            to: ".",
            noErrorOnMissing: platform !== "web",
          },
          // {
          //   from: `manifests/${manifest ?? platform}.json`,
          //   to: 'manifest.json',
          //   noErrorOnMissing: platform === 'web',
          // }
        ],
      }),
      new MiniCssExtractPlugin(),
      ...(platform === "web"
        ? []
        : [
            new MergeJsonWebpackPlugin({
              files: [
                "manifests/base.json",
                `manifests/${manifest ?? platform}.json`,
              ],
              output: {
                fileName: "manifest.json",
              },
              space: 2,
            }),
          ]),
      // Enable for analysis when necessary
      // new BundleAnalyzerPlugin(),
    ],
    node: {
      global: false,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".css"],
      extensionAlias: {
        ".js": [".ts", ".js", ".tsx"],
      },
      fallback: {
        fs: false,
        path: false,
        os: false,
        crypto: false,
      },
      plugins: [new TsconfigPathsPlugin()],
    },
    output: {
      filename: "[name].js",
      path: path.resolve(dirname, "dist", name),
    },
    optimization: {
      minimize: false,
    },
  };
}

const nonDemoIgnores = [
  "**/sql-wasm.wasm",
  "**/demo-history.html",
  "**/chrome-badge.png",
  "**/firefox-badge.png",
];

export default [
  createModule({
    name: "chrome",
    logLevel: "error",
    ignoreAssets: nonDemoIgnores,
    entry: {
      background: "./src/background.ts",
      "content-script": "./src/content-script.ts",
      client: "./src/client/chrome.tsx",
      popup: "./src/client/chrome-popup.tsx",
      offscreen: "./src/offscreen.ts",
      "offscreen-worker": "./src/server/offscreen-worker.ts",
    },
    platform: "chrome",
  }),
  createModule({
    name: "chrome-dev",
    logLevel: "info",
    devMode: true,
    ignoreAssets: nonDemoIgnores,
    entry: {
      background: "./src/background.ts",
      "content-script": "./src/content-script.ts",
      client: "./src/client/chrome.tsx",
      popup: "./src/client/chrome-popup.tsx",
      offscreen: "./src/offscreen.ts",
      "offscreen-worker": "./src/server/offscreen-worker.ts",
    },
    platform: "chrome",
  }),
  createModule({
    name: "firefox",
    logLevel: "error",
    ignoreAssets: nonDemoIgnores,
    entry: {
      background: "./src/background.ts",
      "content-script": "./src/content-script.ts",
      client: "./src/client/firefox.tsx",
      popup: "./src/client/firefox-popup.tsx",
    },
    platform: "firefox",
  }),
  createModule({
    name: "firefox-mv2",
    logLevel: "error",
    manifest: "firefox-mv2",
    ignoreAssets: nonDemoIgnores,
    entry: {
      background: "./src/background.ts",
      "content-script": "./src/content-script.ts",
      client: "./src/client/firefox.tsx",
      popup: "./src/client/firefox-popup.tsx",
    },
    platform: "firefox",
  }),
  createModule({
    name: "demo",
    logLevel: "error",
    ignoreAssets: ["**/icon-*.png", "**/history.html"],
    entry: {
      client: "./src/client/demo.tsx",
      popup: "./src/client/demo-popup.tsx",
      "offscreen-worker": "./src/server/offscreen-worker.ts",
    },
    platform: "web",
  }),
  createModule({
    name: "dev",
    logLevel: "debug",
    devMode: true,
    ignoreAssets: [
      "**/demo-history.html",
      "**/chrome-badge.png",
      "**/firefox-badge.png",
    ],
    entry: {
      client: "./src/client/web.tsx",
      popup: "./src/client/web-popup.tsx",
      "offscreen-worker": "./src/server/offscreen-worker.ts",
    },
    platform: "web",
  }),
];
