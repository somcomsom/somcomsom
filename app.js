const contrastStyles = document.createElement('link');
contrastStyles.rel = 'stylesheet';
contrastStyles.href = './fix-selected-dark.css?v=20260715-1';
document.head.append(contrastStyles);

const nativeFetch = window.fetch.bind(window);
const parts = [
  'data/tree-part-1.mmd',
  'data/tree-part-2.mmd',
  'data/tree-part-3.mmd',
  'data/tree-part-4a.mmd',
  'data/tree-part-4b.mmd',
  'data/tree-part-4c.mmd',
  'data/tree-part-4d.mmd',
  'data/tree-part-5a.mmd',
  'data/tree-part-5b.mmd',
  'data/tree-part-5c.mmd',
  'data/tree-part-5d.mmd'
];

window.fetch = async (input, init) => {
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, location.href);
  if (url.pathname.endsWith('/README.md')) {
    const responses = await Promise.all(parts.map((path) => nativeFetch(`${path}?v=${Date.now()}`, { cache: 'no-store' })));
    const failed = responses.find((response) => !response.ok);
    if (failed) return new Response('', { status: failed.status });
    const chunks = await Promise.all(responses.map((response) => response.text()));
    return new Response(`# Arbre familiar\n\n\`\`\`mermaid\n${chunks.join('')}\n\`\`\`\n`, {
      status: 200,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
    });
  }
  return nativeFetch(input, init);
};

await import('./app-core.js?v=20260715-3');
