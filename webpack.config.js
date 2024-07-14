const path = require('path')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')


module.exports = {
	entry: path.resolve(__dirname, 'docs/index.ts'),
	mode: 'development',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'docs/js'),
	},
	optimization: {},
	plugins: [
		new ForkTsCheckerWebpackPlugin()
	],
	devServer: {
		static: path.resolve(__dirname, 'docs'),
		historyApiFallback: {
			index: 'index.html'
		},
		allowedHosts: 'all',
	},
	devtool: 'cheap-source-map',
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: [{
					loader: 'ts-loader',
					options: {
						transpileOnly: true,
						experimentalWatchApi: true,
					},
				}],
				exclude: /node_modules/
			},
			{
				test: /\.svg$/,
				use: [{
					loader: '@pucelle/webpack-svg-loader',
					options: {},
				}],
			},
		],
	},
}