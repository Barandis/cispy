const config = require('./webpack.config');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const banner = fs.readFileSync(path.resolve(__dirname, 'LICENSE'), 'utf8');

config.output.filename = '[name].min.js';
config.plugins.push(
  new webpack.optimize.UglifyJsPlugin(),
  new webpack.BannerPlugin({ banner, entryOnly: true })
);

module.exports = config;
