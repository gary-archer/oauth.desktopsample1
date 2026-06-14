import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import tailwind from '@tailwindcss/postcss';
import path from 'path';
import {defineConfig, RollupOptions} from 'rollup';
import copy from 'rollup-plugin-copy';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';
import {notifyBrowser} from './plugins/developmentPlugins.js';

const outputFolder = 'dist';
const options: RollupOptions = {

    input: './src/renderer.ts',
    output: {

        // Output ECMAScript modules
        dir: outputFolder,
        format: 'esm',

        // Define chunks names for the entry point app chunk, and any initial chunks referenced in index.html
        entryFileNames: 'app.bundle.js',
        chunkFileNames: '[name].bundle.js',
        manualChunks: (id: string) => {

            if (!id.includes('node_modules')) {
                return null;
            }

            if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
                return 'react';
            }

            return 'vendor';
        },

        // Enable source maps and use correct paths to support debugging
        sourcemap: true,
        sourcemapPathTransform: (relativeSourcePath: string, sourcemapPath: string) => {
            return path.resolve(path.dirname(sourcemapPath), relativeSourcePath);
        },
    },

    watch: {
        clearScreen: false,
    },

    plugins: [

        // Use browser resolution for node_modules
        nodeResolve({
            browser: true,
        }),

        // Convert any commonjs libraries from the node_modules folder to ECMAScript
        commonjs(),

        // Use esbuild as an up to date plugin for building typescript code
        esbuild({
            tsconfig: './tsconfig.json',
            target: 'es2020',
            jsx: 'automatic',
        }),

        // Copy these static files to the output folder when a build completes
        copy({
            targets: [
                { src: 'index.html', dest: outputFolder },
            ],
        }),

        // Build development CSS
        postcss({
            extract: 'app.css',
            plugins: [
                tailwind(),
            ]
        }),

        // Add a plugin that implements live reload
        notifyBrowser(),
    ],
};

export default defineConfig(options);
