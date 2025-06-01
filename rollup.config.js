import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import css from 'rollup-plugin-import-css';
import json from '@rollup/plugin-json';
import del from 'rollup-plugin-delete';

const isProduction = process.env.BUILD === 'production';

export default [
	{
		input: './src/client/ts/application.ts',
		output: {
			file: `./build/client/js/application.js`,
			format: 'esm'
		},
		plugins: [
			css(),
			isProduction ? del({ targets: 'build/*' }) : null,
			json({
				compact: true,
			}),
			typescript(),
			nodeResolve({
			}),
			copy({
				copyOnce: true,
				targets: [
					{ src: 'src/client/index.html', dest: 'build/client/' },
				]
			}),
		],
		onwarn: function onwarn(warning, warn) {
			// Disable circular dependencies in modules
			if (warning.code == 'CIRCULAR_DEPENDENCY' && warning.importer && warning.importer.startsWith('node_modules/')) {
				return;
			}
			warn(warning);
		},
	}
];
