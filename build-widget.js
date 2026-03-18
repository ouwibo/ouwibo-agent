const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['static/src/lifi-init.jsx'],
  bundle: true,
  outfile: 'static/lifi-bundle.js',
  format: 'iife',
  globalName: 'LiFiWidgetLib',
  minify: true,
  loader: { '.js': 'jsx' },
}).then(() => {
  console.log("LI.FI widget bundled successfully!");
}).catch((err) => {
  console.error("Bundling failed:", err);
  process.exit(1);
});
