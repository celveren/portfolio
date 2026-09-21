import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { pages, renderHeader, siteRoot } from '../build-html.mjs';

const partial = readFileSync(resolve(siteRoot, 'partials/header.html'), 'utf8');

test('every deployed page has an up-to-date header and root-relative navigation', () => {
    for (const page of pages) {
        const source = readFileSync(resolve(siteRoot, page), 'utf8');
        assert.equal(renderHeader(source, partial, page), source, page);
        const header = source.match(/<header[\s\S]*?<\/header>/)[0];
        assert.equal((header.match(/aria-current=/g) || []).length,
            ['index.html', 'tools-services.html'].includes(page) ? 1 : 0, page);
        for (const href of ['/index.html#home', '/index.html#projects', '/tools-services.html']) {
            assert.ok(header.includes(`href="${href}"`), `${page}: ${href}`);
        }
        assert.ok(!header.includes('{{'), page);
    }
});

test('partial updates preserve surrounding content and malformed regions fail', () => {
    const before = '<main>Keep this page content.</main>\n';
    const after = '\n<footer>Keep this footer.</footer>';
    const region = '<!-- shared:header:start -->\nold header\n<!-- shared:header:end -->';
    assert.equal(renderHeader(before + region + after, '<header>New</header>', 'example'),
        before + region.replace('old header', '<header>New</header>') + after);
    assert.throws(() => renderHeader(before, partial, 'missing'), /exactly one/);
    assert.throws(() => renderHeader(region + '\n' + region, partial, 'duplicate'), /exactly one/);
    assert.throws(() => renderHeader(region, '{{unknown}}', 'unknown'), /placeholder/);
});

test('shared runtime selects the correct link on root, nested pages, and hash changes', () => {
    const script = readFileSync(resolve(siteRoot, 'script.js'), 'utf8');
    for (const [path, active] of [['/', 0], ['/index.html', 0], ['/#projects', 1], ['/tools-services.html', 2], ['/migration/', -1], ['/missing/nested', -1]]) {
        const links = ['/index.html#home', '/index.html#projects', '/tools-services.html'].map(href => ({
            current: null,
            getAttribute: () => href,
            setAttribute(_, value) { this.current = value; },
            removeAttribute() { this.current = null; },
        }));
        let onHashChange;
        const location = new URL(path, 'https://celveren.dev');
        runInNewContext(script, {
            URL, URLSearchParams,
            window: { location, addEventListener: (_, callback) => { onHashChange = callback; } },
            localStorage: { getItem: () => null },
            document: {
                querySelectorAll: selector => selector === '.header nav a' ? links : [],
                getElementById: () => null,
            },
        });
        assert.equal(links.findIndex(link => link.current), active, path);
        if (path === '/') {
            location.hash = '#projects';
            onHashChange();
            assert.equal(links.findIndex(link => link.current), 1);
        }
    }
});
