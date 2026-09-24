const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
let modalLineIndex = lines.findIndex(l => l.includes('id="gaming-registration-modal"'));
console.log('Found modal at line:', modalLineIndex + 1);

// Let's count unclosed tags up to this line
const selfClosing = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'path', 'polygon', 'line', 'polyline', 'rect', 'circle']);
let openTags = [];

for (let i = 0; i < modalLineIndex; i++) {
  const line = lines[i];
  const tagRegex = /<(\/)?([a-zA-Z0-9\-]+)([^>]*)>/g;
  let match;
  while ((match = tagRegex.exec(line)) !== null) {
    const isClosing = match[1] === '/';
    const tag = match[2].toLowerCase();
    const attrs = match[3];

    if (selfClosing.has(tag) || attrs.endsWith('/')) {
      continue;
    }

    if (isClosing) {
      // Find matching tag from top of stack
      for (let j = openTags.length - 1; j >= 0; j--) {
        if (openTags[j].tag === tag) {
          openTags.splice(j, 1);
          break;
        }
      }
    } else {
      const idMatch = attrs.match(/id=["']([^"']+)["']/);
      const classMatch = attrs.match(/class=["']([^"']+)["']/);
      openTags.push({
        line: i + 1,
        tag: tag,
        id: idMatch ? idMatch[1] : null,
        class: classMatch ? classMatch[1] : null
      });
    }
  }
}

console.log('Unclosed tags before gaming-registration-modal:');
openTags.forEach(t => {
  console.log(`Line ${t.line}: <${t.tag} id="${t.id}" class="${t.class}">`);
});
