import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import { compile, optimize } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function buildStandalonePC() {
  const srcCssPath = path.join(rootDir, 'src', 'index.css');
  const srcCss = fs.readFileSync(srcCssPath, 'utf8');

  const scanner = new Scanner({
    sources: [
      { base: path.join(rootDir, 'src'), pattern: '**/*.{ts,tsx,js,jsx}', negated: false },
      { base: rootDir, pattern: 'index.html', negated: false },
    ],
  });
  const candidates = scanner.scan();

  const compiled = await compile(srcCss, {
    base: path.join(rootDir, 'src'),
    from: srcCssPath,
    onDependency: () => {},
  });
  const rawCss = compiled.build(candidates);
  const optimizedCss = optimize(rawCss, { file: 'index.css', minify: true }).code;

  const jsResult = await esbuild.build({
    entryPoints: [path.join(rootDir, 'src', 'main.tsx')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    write: false,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    plugins: [
      {
        name: 'strip-css-imports',
        setup(build) {
          build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
        },
      },
    ],
  });

  const jsCode = jsResult.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const safeCss = optimizedCss.replace(/<\/style/gi, '<\\/style');

  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Рудопоток — Автономная ПК-версия</title>
    <style>${safeCss}</style>
  </head>
  <body class="bg-[#12161D] text-[#E8EDF5] antialiased selection:bg-amber-500/30 selection:text-amber-100 overflow-hidden">
    <div id="root"></div>
    <script>${jsCode}</script>
  </body>
</html>
`;

  const publicDir = path.join(rootDir, 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  const outPath = path.join(publicDir, 'rudopotok-pc.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Built standalone PC bundle: ${outPath} (${Math.round(Buffer.byteLength(html, 'utf8') / 1024)} KB)`);
}

buildStandalonePC().catch((err) => {
  console.error('Failed to build standalone PC bundle:', err);
  process.exit(1);
});
