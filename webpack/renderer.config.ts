import path from 'path';
import webpack from 'webpack';

/*
 * Performs tree shaking to avoid deploying main code to renderer bundles
 */
const dirname = process.cwd();
const config: webpack.Configuration = {

    // Let webpack know this is a debug build
    mode: 'development',

    // Build for a web target
    target: ['web'],

    // Always output source maps since we are building bundles
    devtool: 'source-map',

    // Set the working folder
    context: path.resolve(dirname, './src'),

    entry: {
        // Pull in all dependencies starting from the renderer file
        app: ['./renderer.ts']
    },
    module: {
        rules: [
            {
                // Files with a .ts extension are loaded by the Typescript loader
                test: /\.(ts)$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        onlyCompileBundledFiles: true,
                        configFile: '../tsconfig-renderer.json',
                    },
                }],
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {

        // Set extensions for import statements, and the .js extension allows us to import modules from JS libraries
        extensions: ['.ts', '.js']
    },
    output: {

        // Output ECMAScript bundles to the dist folder
        path: path.resolve(dirname, './dist'),
        filename: '[name].bundle.js',
        module: true,

        // Enable stepping through frontend TypeScript code in the Visual Studio Code debugger
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]',
    },
    experiments: {
        outputModule: true,
    },
    optimization: {

        // Indicate that third party code is built to a separate vendor bundle file
        splitChunks: {
            cacheGroups: {
                vendor: {
                    chunks: 'initial',
                    name: 'vendor',
                    test: /node_modules/,
                    enforce: true,
                },
            }
        }
    }
};

export default config;
