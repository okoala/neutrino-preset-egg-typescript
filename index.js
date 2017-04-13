'use strict';

const banner = require('neutrino-middleware-banner');
const compile = require('neutrino-middleware-compile-loader');
const copy = require('neutrino-middleware-copy');
const clean = require('neutrino-middleware-clean');
const loaderMerge = require('neutrino-middleware-loader-merge');
const nameModule = require('neutrino-middleware-named-modules');
const nodeExternals = require('webpack-node-externals');
const typescript = require.resolve('awesome-typescript-loader');
const babelEnv = require('babel-preset-env');

const glob = require('glob');
const { join, extname } = require('path');
const { path } = require('ramda');

const MODULES = join(__dirname, 'node_modules');

module.exports = neutrino => {
  const config = neutrino.config;

  if (!path([ 'options', 'compile', 'targets', 'node' ], neutrino)) {
    Object.assign(neutrino.options, {
      compile: {
        targets: {
          node: 6.9,
        },
      },
    });
  }

  const globPattern = [
    neutrino.options.root + '/app/**/*.ts',
    neutrino.options.root + '/config/**\.*',
    neutrino.options.root + '/index.ts',
  ];

  const files = glob.sync(`{${globPattern.join(',')}}`).reduce((acc, item) => {
    const obj = {};
    const ext = extname(item);
    obj[
      item.replace(neutrino.options.root.replace(/\\/g, '/') + '/', '')
      .replace(ext, '')
    ] = item;
    return Object.assign(acc, obj);
  }, {});

  Object.keys(files).forEach(name => {
    config.entry(name).add(files[name]);
  });

  // TypeScript
  config.module
    .rule('compile')
    .test(/\.tsx?$/)
    .use('ts')
    .loader(typescript);

  config.performance
    .hints(false);

  config.target('node').node
    .set('__filename', false)
    .set('__dirname', false);

  config
    .devtool('source-map')
    .externals([ nodeExternals({ whitelist: [ /^webpack/ ] }) ])
    .context(neutrino.options.root);

  config.output
    .path(neutrino.options.output)
    .filename('[name].js')
    .libraryTarget('commonjs2')
    .chunkFilename('[id].[hash.5]-[chunkhash:7].js');

  config.resolve
    .modules
    .add('node_modules')
    .add(neutrino.options.node_modules)
    .add(MODULES);

  config.resolve
    .extensions
    .add('.js')
    .add('.ts')
    .add('.json');

  config.resolveLoader
    .modules
    .add(neutrino.options.node_modules)
    .add(MODULES);

  // special handle
  config
    .when(process.env.NODE_ENV && process.env.NODE_ENV !== 'development',
      () => {
        neutrino.use(clean, { paths: [ neutrino.options.output ] });
        neutrino.use(copy, {
          patterns: [{ context: neutrino.options.source, from: '**/*' }],
          options: { ignore: [ '*.js*', '*.ts*' ] },
        });
        config.devtool('inline-sourcemap');
        config.output.devtoolModuleFilenameTemplate('[absolute-resource-path]');
      }
    )
    .when(neutrino.config.module.rules.has('lint'),
      () => {
        neutrino.use(loaderMerge('lint', 'eslint'), {
          extends: 'eslint-config-egg',
        });
      }
    );

  // add source-map-support banner
  neutrino.use(banner);
  neutrino.use(nameModule);
  neutrino.use(compile, {
    include: [ neutrino.options.source, neutrino.options.tests ],
    presets: [
      [ babelEnv, {
        modules: false,
        targets: neutrino.options.compile.targets,
      }],
    ],
  });
};
