const path = require('path');

module.exports = {
  entry: {
    landing: './src/landing.js',
    order: './src/order.js',
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist', 'js'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
    ],
  },
  resolve: {
    alias: {
      jquery$: require.resolve('jquery/dist/jquery.slim'),
    },
  },
};
