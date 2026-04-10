// const { getDefaultConfig } = require('expo/metro-config');
// const { withUniwindConfig } = require('uniwind/metro'); 

// const config = getDefaultConfig(__dirname);

// // your metro modifications

// module.exports = withUniwindConfig(config, {  
//   // relative path to your global.css file (from previous step)
//   cssEntryFile: './global.css',
//   // (optional) path where we gonna auto-generate typings
//   // defaults to project's root
// //   dtsFile: './src/uniwind-types.d.ts'
// });


const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// ======================
// SVG Transformer Setup
// ======================
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'), // Important: use /expo version
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'), // Remove svg from assets
  sourceExts: [...resolver.sourceExts, 'svg'],                 // Add svg as source
};

// ======================
// Apply Uniwind (must be outermost)
// ======================
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  // dtsFile: './src/uniwind-types.d.ts' // if you use this
});