const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/app.js', // Path to your main JS file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development', // Change to 'production' for optimized builds
  resolve: {
    extensions: ['.js'],
    fallback: {
      assert: require.resolve('assert/'),
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      zlib: require.resolve('browserify-zlib'),
      util: require.resolve('util/'),
      url: require.resolve('url/'),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // Use your source index.html
      filename: 'index.html', // Output to dist/index.html
      inject: 'body', // Ensure scripts are loaded in the body
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'], // Load and bundle CSS files
      },
    ],
  },
};
