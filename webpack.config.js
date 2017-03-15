const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: [
    './src/api.js'
  ],
  output: {
    filename: 'cispy.js',
    library: 'cispy',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'lib')
  },
  plugins: [],
  module: {
    loaders: [{
      loader: 'babel-loader',
      include: [
        path.resolve(__dirname, 'src')
      ],
      test: /\.js$/
    }]
  }
};
