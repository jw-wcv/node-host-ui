const path = require('path');

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
