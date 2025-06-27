const path = require("path");

module.exports = {
  entry: "./src/app.ts", // エントリーポイントを指定
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"], // これにより、.tsファイルと.jsファイルを解決します
  },
  output: {
    filename: "bundle.js", // 出力されるバンドルファイル名
    path: path.resolve(__dirname, "dist"), // 出力ディレクトリ
  },
  devServer: {
    static: [
      {
        directory: path.join(__dirname, "dist"),
      },
      {
        directory: __dirname,
        serveIndex: false,
      }
    ],
    compress: true,
    port: 9000,
    historyApiFallback: {
      index: '/index.html'
    }
  }
  
};
