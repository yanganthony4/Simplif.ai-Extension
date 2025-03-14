const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin"); // Add this line

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
        { from: "src/content.js", to: "content.js" }, // Copies content.js to dist
      ],
    }),
  ],
  mode: "production",
};