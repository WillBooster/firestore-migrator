const webpack = require('webpack');

if (!process.env.NODE_ENV) {
  throw new Error('Please specify `process.env.NODE_ENV`.');
}

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/index.ts',
  mode: isProduction ? 'production' : 'development',
  target: 'node',
  externals: ['encoding'],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /\/node_modules\//,
        loader: 'babel-loader',
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ],
  devtool: isProduction ? false : 'eval-source-map',
  cache: {
    type: 'filesystem',
  },
};
