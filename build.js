// Tiny static build: inlines shared partials into each page.
// Usage: node build.js   -> writes *.html into the project root.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const partial = (name) => fs.readFileSync(path.join(SRC, 'partials', name + '.html'), 'utf8');

const head = partial('head');
const header = partial('header');
const footer = partial('footer');
const tail = partial('tail');

for (const file of fs.readdirSync(path.join(SRC, 'pages'))) {
  if (!file.endsWith('.html')) continue;
  let page = fs.readFileSync(path.join(SRC, 'pages', file), 'utf8');

  // Front-matter: <!--meta title="..." desc="..." nav="work" body="..." -->
  const meta = {};
  page = page.replace(/<!--meta([\s\S]*?)-->\s*/, (_, attrs) => {
    attrs.replace(/(\w+)="([^"]*)"/g, (__, k, v) => (meta[k] = v));
    return '';
  });

  let navHeader = header.replace(
    new RegExp(`(<a[^>]*data-nav="${meta.nav}")`, 'g'),
    '$1 aria-current="page"'
  );

  const out = head
    .replace(/{{title}}/g, meta.title || 'Designing Dose')
    .replace(/{{desc}}/g, meta.desc || '')
    .replace(/{{body}}/g, meta.body || '') +
    navHeader +
    '\n<main id="main">\n' + page + '\n</main>\n' +
    footer + tail;

  fs.writeFileSync(path.join(__dirname, file), out);
  console.log('built', file);
}
