const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

const banner = fs.readFileSync(path.resolve(__dirname, 'LICENSE'), 'utf8');

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
  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.BannerPlugin({ banner: banner, entryOnly: true })
  ],
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
