import { build } from 'esbuild';

await build({
  stdin: {
    contents: "export { createClient } from '@supabase/supabase-js';",
    resolveDir: process.cwd(),
    sourcefile: 'supabase-entry.js'
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  outfile: 'dist/shared/vendor/supabase.js',
  legalComments: 'eof'
});

console.log('Supabase browser SDK built.');
