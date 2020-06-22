import ts from '@wessberg/rollup-plugin-ts';
import packageJson from './package.json';

const plugins = [
  ts({
    transpiler: 'babel',
  }),
];
const external = Object.keys(packageJson.dependencies);

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    plugins,
    external,
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins,
    external,
  },
];
