import dts from 'rollup-plugin-dts';
import {defineConfig} from 'rollup';
import typescript from 'typescript';
import {babel} from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import pluginTypescript from '@rollup/plugin-typescript';
import camelCase from 'lodash.camelcase';

const libraryName = camelCase('jsonrpcWsBrowserServer');


export default defineConfig([
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/iife/index.js',
                format: 'iife',
                name: libraryName
            },
            {
                file: 'dist/index.mjs',
                format: 'esm',
                name: libraryName
            }
        ],
        plugins: [
            pluginTypescript({
                exclude: 'node_modules/**',
                typescript
            }),
            nodeResolve(),
            commonjs(),
            babel({babelHelpers: 'bundled'}),
            terser()
        ]
    },
    {
        input: 'src/index.ts',
        output: [{file: 'dist/index.d.ts', format: 'es'}],
        plugins: [dts()]
    }
]);