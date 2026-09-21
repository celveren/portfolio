import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const siteRoot = fileURLToPath(new URL('../', import.meta.url));
export const pages = ['index.html', 'tools-services.html', 'migration/index.html', '404.html', 'previews/index.html'];

export function renderHeader(source, partial, page) {
    const region = /^( *)<!-- shared:header:start -->\n[\s\S]*?^\1<!-- shared:header:end -->/gm;
    const matches = [...source.matchAll(region)];
    if (matches.length !== 1) {
        throw new Error(`${page}: expected exactly one shared header region`);
    }
    const header = partial.trimEnd()
        .replaceAll('{{homeCurrent}}', page === 'index.html' ? ' aria-current="location"' : '')
        .replaceAll('{{toolsCurrent}}', page === 'tools-services.html' ? ' aria-current="page"' : '');
    if (/\{\{.*?\}\}/.test(header)) {
        throw new Error(`${page}: unknown header placeholder`);
    }
    return source.replace(region, (_, indent) => [
        `${indent}<!-- shared:header:start -->`,
        ...header.split('\n').map(line => `${indent}${line}`),
        `${indent}<!-- shared:header:end -->`,
    ].join('\n'));
}

export function buildHtml(root = siteRoot) {
    const partial = readFileSync(resolve(root, 'partials/header.html'), 'utf8');
    // Validate every page before writing any, and avoid writes that trigger watch loops.
    const outputs = pages.map(page => {
        const path = resolve(root, page);
        const source = readFileSync(path, 'utf8');
        return { path, source, output: renderHeader(source, partial, page) };
    });
    for (const { path, source, output } of outputs) {
        if (source !== output) writeFileSync(path, output);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    buildHtml();
}
