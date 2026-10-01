// Genera dist/rss.xml (para el importador de Substack) + dist/index.html a partir de posts/*.md
import fs from 'node:fs';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { marked } from 'marked';

// Netlify define URL en el build; para deploy manual: SITE_URL=https://xxx.netlify.app npm run build
const SITE = (process.env.SITE_URL || process.env.URL || 'http://localhost:8888').replace(/\/$/, '');
const DOCS = 'https://docs.near.org';
const BLOG = 'https://neardev.substack.com';  // ponytail: asume que Substack conserva el slug del <link> (verificado con we-have-a-blog)

// Imágenes con hash de Docusaurus que ya no existen en producción
const RENAMES = {
  '/assets/images/protocol-b73c2a3ace3307226ee7eb2149ee432f.png': '/assets/images/protocol.png',
  '/assets/images/contracts-landing-5a9c76a78e71b0e5f9a96033f1f23d23.png': '/assets/images/contracts-landing.png',
};

const authors = yaml.load(fs.readFileSync('posts/authors.yml', 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// :::tip Título ... ::: -> blockquote (Substack no tiene admonitions)
function admonitions(md) {
  return md.replace(/^:::(\w+)[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*$/gm, (_, kind, title, body) => {
    const label = kind[0].toUpperCase() + kind.slice(1) + (title ? `: ${title}` : '');
    return [`**${label}**`, '', ...body.trimEnd().split('\n')].map((l) => `> ${l}`.trimEnd()).join('\n') + '\n';
  });
}

function absolutize(html) {
  for (const [from, to] of Object.entries(RENAMES)) html = html.replaceAll(from, to);
  return html
    .replace(/(src|srcset)="\/(?!\/)/g, `$1="${SITE}/`)
    .replace(/href="\/(?!\/)/g, `href="${DOCS}/`)
    .replace(/href="https:\/\/docs\.near\.org\/blog\//g, `href="${BLOG}/p/`);
}

// Substack no mapea autores externos: firma visible al inicio del post
const byline = (ids) => ids.length ? `<p><em>By ${ids.map((a) => {
  const { name = a, url } = authors[a] || {};
  return url ? `<a href="${url}">${esc(name.trim())}</a>` : esc(name.trim());
}).join(', ')}</em></p>\n` : '';

const posts = fs.readdirSync('posts').filter((f) => f.endsWith('.md')).sort().reverse().map((file) => {
  const { data, content } = matter(fs.readFileSync(`posts/${file}`, 'utf8'));
  const md = admonitions(content.replace('<!-- truncate -->', '').replace(/\s*style=\{\{[^}]*\}\}/g, ''));  // JSX style no es HTML
  return {
    title: data.title,
    slug: data.slug,
    date: new Date(file.slice(0, 10) + 'T12:00:00Z'),
    authors: (data.authors || []).map((a) => authors[a]?.name?.trim() || a),
    tags: data.tags || [],
    html: byline(data.authors || []) + absolutize(marked.parse(md)),
  };
});

const items = posts.map((p) => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${BLOG}/p/${p.slug}</link>
      <guid isPermaLink="false">${p.slug}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <dc:creator>${esc(p.authors.join(', '))}</dc:creator>
      ${p.tags.map((t) => `<category>${esc(t)}</category>`).join('')}
      <content:encoded><![CDATA[${p.html.replaceAll(']]>', ']]]]><![CDATA[>')}]]></content:encoded>
    </item>`).join('');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>NEAR Docs Blog</title>
    <link>${BLOG}</link>
    <description>NEAR documentation dev blog</description>${items}
  </channel>
</rss>
`;

fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('public', 'dist', { recursive: true });
fs.writeFileSync('dist/rss.xml', rss);
fs.writeFileSync('dist/index.html', `<!doctype html><meta charset="utf-8"><title>NEAR Devblog export</title>
<p>Feed para Substack: <a href="rss.xml">${SITE}/rss.xml</a></p>
${posts.map((p) => `<details><summary>${p.date.toISOString().slice(0, 10)} · ${esc(p.title)}</summary>${p.html}</details>`).join('\n')}
`);
console.log(`${posts.length} posts -> dist/rss.xml (SITE=${SITE})`);
