const path = require('path')
//const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')


module.exports = {
	entry: path.join(__dirname, 'docs/out/index.js'),
	mode: 'development',
	output: {
		filename: 'docs/js/bundle.js',
	},
	optimization: {},
	plugins: [
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
		openPage: 'docs/index.html' 
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

			// {
			// 	test: /\.tsx?$/,
			// 	use: [{
			// 		loader: 'ts-loader',
			// 		options: {

			// 			// Required, or types of imported modules are not loaded.
			// 			transpileOnly: false,
	
			// 			// Specifies `getCustomTransformers` not working.
			// 			compiler: 'ts-patch/compiler',

			// 			// Optional.
			// 			// configFile: './tsconfig.json'
			// 		},
			// 	}],
			// 	exclude: /node_modules/
			// },
		],
	},
}