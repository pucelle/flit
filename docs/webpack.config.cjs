const path = require('path')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')


module.exports = {
	entry: path.resolve(__dirname, 'index.ts'),
	mode: 'development',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'js'),
	},
	optimization: {},
	plugins: [
		new ForkTsCheckerWebpackPlugin()
	],
	devServer: {
		static: __dirname,
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
				test: /\.svg$/,
				loader: 'svg-inline-loader',
				options: {
					removingTags: ['title', 'desc', 'defs', 'style'],
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

			{
				test: /\.tsx?$/,
				use: [{
					loader: 'ts-loader',
					options: {

						// Required, or types of imported modules are not loaded.
						transpileOnly: false,
	
						// Specifies `getCustomTransformers` now working.
						compiler: 'ts-patch/compiler',

						// Optional.
						// configFile: './tsconfig.json'
					},
				}],
				exclude: /node_modules/
			},
		],
		// rules: [
		// 	{
		// 		test: /\.svg$/,
		// 		use: [{
		// 			loader: '@pucelle/webpack-svg-loader',
		// 			options: {},
		// 		}],
		// 	},
		// ],
	},
}