import path from "path"

export const outputConfig = {
	destPath: "./dist",
}

// Entry points
// https://webpack.js.org/concepts/entry-points/
export const entryConfig = ["./src/index.tsx"]

// Copy files from src to dist
// https://webpack.js.org/plugins/copy-webpack-plugin/
export const copyPluginPatterns = {
	patterns: [{ from: "./src/assets/images", to: "images" }],
}

// Dev server setup
// https://webpack.js.org/configuration/dev-server/
export const devServer = {
	static: {
		directory: path.join(__dirname, outputConfig.destPath),
	},
}

// Production terser config options
// https://webpack.js.org/plugins/terser-webpack-plugin/#terseroptions
export const terserPluginConfig = {
	extractComments: false,
	terserOptions: {
		compress: {
			drop_console: true,
		},
	},
}
