const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'none',
  entry: './src/api.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'cispy.js',
    library: 'cispy',
    libraryTarget: 'umd',
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
    ],
  },
};
