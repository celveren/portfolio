import { watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { buildHtml, pages, siteRoot } from './build-html.mjs';

buildHtml();
const css = spawn(process.execPath, [
    resolve(siteRoot, 'node_modules/@tailwindcss/cli/dist/index.mjs'),
    '-i', 'input.css', '-o', 'styles.css', '--watch=always',
], { cwd: siteRoot, stdio: 'inherit' });
let timer;
const inputs = [...pages, 'partials/header.html'];
// Watch directories so editor save-by-rename operations keep working.
const watchers = [...new Set(inputs.map(dirname))].map(directory => watch(
    resolve(siteRoot, directory),
    (_, filename) => {
        if (filename && !inputs.some(input => resolve(siteRoot, input) === resolve(siteRoot, directory, String(filename)))) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
            try { buildHtml(); } catch (error) { console.error(error.message); }
        }, 100);
    },
));

function close() {
    clearTimeout(timer);
    watchers.forEach(watcher => watcher.close());
}
for (const watcher of watchers) {
    watcher.on('error', error => {
        console.error(error);
        process.exitCode = 1;
        close();
        css.kill();
    });
}
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => { close(); css.kill(signal); });
}
css.on('error', error => { console.error(error); close(); process.exitCode = 1; });
css.on('exit', code => { close(); process.exitCode ||= code ?? 0; });
