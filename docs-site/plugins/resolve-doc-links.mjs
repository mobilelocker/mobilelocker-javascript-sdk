import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT_MARKER = '/src/content/docs/';

/**
 * GitHub Pages serves each doc at a trailing-slash directory
 * (`/domains/scanner/`), so a file-relative href is one segment short in the
 * browser. Resolve against the content file's directory and emit a root path
 * with the site base instead.
 *
 * @param {string} href
 * @param {string} contentFile absolute path of the markdown/mdx file
 * @param {string | undefined} base Astro `base` (`/mobilelocker-javascript-sdk` or `/`)
 * @returns {string | undefined} rewritten href, or undefined to leave it alone
 */
export function resolveDocHref(href, contentFile, base) {
	if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
		return undefined;
	}

	const relDir = contentDir(contentFile);
	if (relDir == null) return undefined;

	const hashAt = href.indexOf('#');
	const hash = hashAt === -1 ? '' : href.slice(hashAt);
	const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
	const queryAt = beforeHash.indexOf('?');
	const query = queryAt === -1 ? '' : beforeHash.slice(queryAt);
	const pathname = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
	if (!pathname) return undefined;

	let sitePath;
	if (pathname === '.' || pathname === './') {
		// `./#anchor` is the current page, whose URL includes the filename.
		sitePath = pagePath(contentFile);
	} else if (pathname.startsWith('/')) {
		sitePath = pathname;
	} else {
		const from = new URL(`https://docs.local/${relDir ? `${relDir}/` : ''}`);
		sitePath = new URL(pathname, from).pathname;
	}

	sitePath = sitePath
		.split('/')
		.map((seg) => (seg === '..' || seg === '.' ? seg : seg.toLowerCase()))
		.join('/');

	if (path.posix.extname(sitePath) === '' && !sitePath.endsWith('/')) {
		sitePath += '/';
	}

	const prefix = !base || base === '/' ? '' : base.replace(/\/$/, '');
	if (prefix && sitePath !== prefix && !sitePath.startsWith(`${prefix}/`)) {
		sitePath = `${prefix}${sitePath}`;
	}

	return `${sitePath}${query}${hash}`;
}

/**
 * @param {string | undefined} base
 * @returns {import('satteri').MdastPluginDefinition}
 */
export function docLinkMdastPlugin(base) {
	return {
		name: 'resolve-doc-links',
		link(node, ctx) {
			const filePath = ctx.fileURL ? fileURLToPath(ctx.fileURL) : undefined;
			if (!filePath) return;
			const next = resolveDocHref(node.url, filePath, base);
			if (next && next !== node.url) ctx.setProperty(node, 'url', next);
		},
		mdxJsxFlowElement(node, ctx) {
			rewriteJsxHref(node, ctx, base);
		},
		mdxJsxTextElement(node, ctx) {
			rewriteJsxHref(node, ctx, base);
		},
	};
}

function rewriteJsxHref(node, ctx, base) {
	const filePath = ctx.fileURL ? fileURLToPath(ctx.fileURL) : undefined;
	if (!filePath) return;
	let changed = false;
	const attributes = node.attributes.map((attr) => {
		if (attr.type !== 'mdxJsxAttribute' || attr.name !== 'href' || typeof attr.value !== 'string') {
			return attr;
		}
		const next = resolveDocHref(attr.value, filePath, base);
		if (!next || next === attr.value) return attr;
		changed = true;
		return { ...attr, value: next };
	});
	if (!changed) return;
	// Attribute objects are materialized copies, so setProperty cannot target them.
	ctx.replaceNode(node, {
		type: node.type,
		name: node.name,
		attributes,
		_keepChildren: true,
	});
}

/** Directory of a docs content file, relative to `src/content/docs`, or null. */
function contentDir(contentFile) {
	const rel = contentRel(contentFile);
	if (rel == null) return null;
	const dir = path.posix.dirname(rel);
	return dir === '.' ? '' : dir;
}

/** Trailing-slash URL path for this content file, without the site base. */
function pagePath(contentFile) {
	const rel = contentRel(contentFile);
	if (rel == null) return '/';
	const noExt = rel.replace(/\.mdx?$/, '');
	if (noExt === 'index' || noExt.endsWith('/index')) {
		const dir = path.posix.dirname(noExt);
		return dir === '.' ? '/' : `/${dir}/`;
	}
	return `/${noExt}/`;
}

function contentRel(contentFile) {
	const normalized = contentFile.split(path.sep).join('/');
	const at = normalized.lastIndexOf(CONTENT_MARKER);
	if (at === -1) return null;
	return normalized.slice(at + CONTENT_MARKER.length);
}
