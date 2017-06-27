const path = require('path');

module.exports = {
  entry: {
    cispy: './src/cispy.js',
    'cispy.generator': './src/generator.js',
    'cispy.promise': './src/promise.js'
  },
  output: {
    filename: '[name].js',
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
