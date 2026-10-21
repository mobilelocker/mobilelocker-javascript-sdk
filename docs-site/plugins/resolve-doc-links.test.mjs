import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDocHref } from './resolve-doc-links.mjs';

const scanner = '/repo/docs-site/src/content/docs/domains/scanner.mdx';
const overview = '/repo/docs-site/src/content/docs/domains/index.mdx';
const home = '/repo/docs-site/src/content/docs/index.mdx';
const apiPage = '/repo/docs-site/src/content/docs/api/variables/scanner.md';
const base = '/mobilelocker-javascript-sdk';

test('leaf page file-relative links include the production base', () => {
	assert.equal(
		resolveDocHref('../examples/demo-iva/', scanner, base),
		'/mobilelocker-javascript-sdk/examples/demo-iva/',
	);
	assert.equal(
		resolveDocHref('congresses/', scanner, base),
		'/mobilelocker-javascript-sdk/domains/congresses/',
	);
	assert.equal(
		resolveDocHref('../api/type-aliases/ScanResult/', scanner, base),
		'/mobilelocker-javascript-sdk/api/type-aliases/scanresult/',
	);
});

test('index pages use the same file-relative rule', () => {
	assert.equal(
		resolveDocHref('../examples/demo-iva/', overview, base),
		'/mobilelocker-javascript-sdk/examples/demo-iva/',
	);
	assert.equal(resolveDocHref('user/', overview, base), '/mobilelocker-javascript-sdk/domains/user/');
	assert.equal(resolveDocHref('examples/demo-iva/', home, '/'), '/examples/demo-iva/');
});

test('local base is a root path, and external or hash links stay put', () => {
	assert.equal(resolveDocHref('../examples/demo-iva/', scanner, undefined), '/examples/demo-iva/');
	assert.equal(resolveDocHref('https://github.com/mobilelocker/mobilelocker-sdk-demo', scanner, base), undefined);
	assert.equal(resolveDocHref('#scanner', scanner, base), undefined);
	assert.equal(
		resolveDocHref('../examples/demo-iva/#scanner', scanner, base),
		'/mobilelocker-javascript-sdk/examples/demo-iva/#scanner',
	);
});

test('generated API links are lowercased from the file directory', () => {
	assert.equal(
		resolveDocHref('../type-aliases/ScanResult/', apiPage, base),
		'/mobilelocker-javascript-sdk/api/type-aliases/scanresult/',
	);
	assert.equal(
		resolveDocHref('./#getall', apiPage, base),
		'/mobilelocker-javascript-sdk/api/variables/scanner/#getall',
	);
});

test('files outside the docs collection are ignored', () => {
	assert.equal(resolveDocHref('readme/', '/repo/README.md', base), undefined);
});
