import path from "path"
import { CleanWebpackPlugin } from "clean-webpack-plugin"
import HtmlWebpackPlugin from "html-webpack-plugin"
import CopyPlugin from "copy-webpack-plugin"
import TerserPlugin from "terser-webpack-plugin"
import {
	outputConfig,
	entryConfig,
	terserPluginConfig,
} from "./env.config"
import webpack from "webpack"
import MiniCssExtractPlugin from "mini-css-extract-plugin"

module.exports = (
	env: string,
	options: webpack.Configuration
): webpack.Configuration => {
	return {
		mode: options.mode,
		entry: entryConfig,
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: "ts-loader",
					exclude: /node_modules/,
				},
				{
					test: /\.(?:ico|gif|png|jpg|jpeg|svg)$/i,
					type: "javascript/auto",
					loader: "file-loader",
					options: {
						publicPath: "../",
						name: "[path][name].[ext]",
						context: path.resolve(__dirname, "src/assets"),
						emitFile: false,
					},
				},
				{
					test: /\.css$/,
					use: [MiniCssExtractPlugin.loader, "css-loader"],
				},
			],
		},
		resolve: { extensions: [".tsx", ".ts", ".js"] },
		output: {
			filename: "js/[name].bundle.js",
			path: path.resolve(__dirname, outputConfig.destPath),
			publicPath: "",
		},
		optimization: {
			minimizer: [new TerserPlugin(terserPluginConfig)],
			splitChunks: {
				chunks: "all",
			},
		},
		plugins: [
			new CleanWebpackPlugin(),
			new HtmlWebpackPlugin({
				template: "./src/index.html",
				inject: true,
				minify: false,
			}),
			new MiniCssExtractPlugin(),
		],
	}
}
