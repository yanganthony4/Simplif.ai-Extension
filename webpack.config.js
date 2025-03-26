const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = {
  entry: "./src/popup.tsx", // Entry point for your React app
  output: {
    filename: "popup.js",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/popup.html", // Generates popup.html in dist
      filename: "popup.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/content.js", to: "content.js" },
        { from: "src/background.js", to: "background.js" },
        { from: "global.css", to: "global.css" }, // Copy global CSS from root folder
      ],
    }),
  ],
  mode: "production",
}

