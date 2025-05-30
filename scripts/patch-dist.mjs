import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
for (const file of fs.readdirSync(distDir)) {
  if (!file.endsWith('.js')) continue;
  const filePath = path.join(distDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  // replace import specifiers without extension (handles multi-line)
  content = content.replace(/import[^;]+from\s+['"]([^'"]+)['"]/g, (m, spec) => {
    if (!spec.startsWith('.') || spec.endsWith('.js')) return m;
    return m.replace(spec, spec + '.js');
  });
  fs.writeFileSync(filePath, content);
}
