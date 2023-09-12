import path from "path"

export const outputConfig = {
	destPath: "./dist",
}

// Entry points
// https://webpack.js.org/concepts/entry-points/
export const entryConfig = ["./src/index.tsx"]

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
