//const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')


module.exports = {
	entry: './docs/out/index.js',
	mode: 'development',
	output: {
		path: __dirname,
		filename: 'docs/js/bundle.js',
	},
	optimization: {
		usedExports: true,
		sideEffects: false,
	},
	plugins: [
		// Required when use `ts-loader`.
		//new ForkTsCheckerWebpackPlugin()
	],
	devServer: {
		static: {
			directory: __dirname,
			watch: false,
		},
		historyApiFallback: {
			index: 'docs/index.html'
		},
		allowedHosts: 'all',
		open: ['docs/index.html'],
	},
	devtool: 'cheap-source-map',
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				loader: '@pucelle/webpack-svg-loader',
				options: {
					cut: true,
					mainColor: '#000000',
				}
			},

			// Ensure can read `.js` omitted module imports that compiled by typescript.
			{
				test: /\.m?js/,
				type: 'javascript/auto',
				resolve: {
					fullySpecified: false,
				},
			},
		],
	},
}