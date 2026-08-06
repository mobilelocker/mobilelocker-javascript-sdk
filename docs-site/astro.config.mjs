// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// GitHub Pages project site: https://mobilelocker.github.io/mobilelocker-javascript-sdk/
const isProd = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true';

// https://astro.build/config
export default defineConfig({
	site: 'https://mobilelocker.github.io',
	base: isProd ? '/mobilelocker-javascript-sdk' : undefined,
	integrations: [
		starlight({
			title: 'JavaScript SDK',
			description:
				'Official JavaScript SDK for building interactive presentations and custom features on the Mobile Locker platform.',
			favicon: '/favicon.svg',
			logo: {
				src: './public/mobilelocker_logo.svg',
				alt: 'Mobile Locker',
				replacesTitle: true,
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/mobilelocker/mobilelocker-javascript-sdk',
				},
			],
			head: [
				{
					tag: 'link',
					attrs: {
						rel: 'alternate',
						type: 'text/plain',
						title: 'llms.txt',
						href: isProd ? '/mobilelocker-javascript-sdk/llms.txt' : '/llms.txt',
					},
				},
			],
			customCss: ['./src/styles/custom.css'],
			components: {
				// Higher-res hero images (default Starlight uses 400x400).
				Hero: './src/components/Hero.astro',
			},
			editLink: {
				baseUrl: 'https://github.com/mobilelocker/mobilelocker-javascript-sdk/edit/develop/docs-site/',
			},
			lastUpdated: false,
			pagination: true,
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'Overview', slug: 'index' },
						{ label: 'Install', slug: 'guides/install' },
						{ label: 'Getting started', slug: 'guides/getting-started' },
						{ label: 'UMD in presentation HTML', slug: 'guides/umd-html' },
						{ label: 'Environments', slug: 'guides/environments' },
						{ label: 'Changelog', slug: 'guides/changelog' },
					],
				},
				{
					label: 'Examples',
					items: [
						{ label: 'Overview', slug: 'examples' },
						{ label: 'SDK Demo IVA', slug: 'examples/demo-iva' },
					],
				},
				{
					label: 'Domains',
					items: [
						{ label: 'Overview', slug: 'domains' },
						{
							label: 'People & CRM',
							collapsed: false,
							items: [
								{ label: 'User', slug: 'domains/user' },
								{ label: 'Contacts', slug: 'domains/contacts' },
								{ label: 'CRM', slug: 'domains/crm' },
								{ label: 'Congresses', slug: 'domains/congresses' },
								{ label: 'Scanner', slug: 'domains/scanner' },
								{ label: 'Search', slug: 'domains/search' },
							],
						},
						{
							label: 'Content & data',
							collapsed: true,
							items: [
								{ label: 'Presentation', slug: 'domains/presentation' },
								{ label: 'Data', slug: 'domains/data' },
								{ label: 'Database', slug: 'domains/database' },
								{ label: 'Analytics', slug: 'domains/analytics' },
								{ label: 'Session', slug: 'domains/session' },
							],
						},
						{
							label: 'Persistence & network',
							collapsed: true,
							items: [
								{ label: 'Storage', slug: 'domains/storage' },
								{ label: 'localforage', slug: 'domains/localforage' },
								{ label: 'HTTP', slug: 'domains/http' },
								{ label: 'Network', slug: 'domains/network' },
							],
						},
						{
							label: 'Device & UI',
							collapsed: true,
							items: [
								{ label: 'Device', slug: 'domains/device' },
								{ label: 'Permissions', slug: 'domains/permissions' },
								{ label: 'UI', slug: 'domains/ui' },
								{ label: 'Share', slug: 'domains/share' },
								{ label: 'Log', slug: 'domains/log' },
							],
						},
						{ label: 'Errors', slug: 'domains/errors' },
					],
				},
				{
					label: 'API reference',
					items: [
						{ label: 'Overview', slug: 'api' },
						{
							label: 'Modules',
							collapsed: false,
							items: [{ autogenerate: { directory: 'api/variables' } }],
						},
						{
							label: 'Functions',
							collapsed: true,
							items: [{ autogenerate: { directory: 'api/functions' } }],
						},
						{
							label: 'Classes',
							collapsed: true,
							items: [{ autogenerate: { directory: 'api/classes' } }],
						},
						{
							label: 'Interfaces',
							collapsed: true,
							items: [{ autogenerate: { directory: 'api/interfaces' } }],
						},
						{
							label: 'Type aliases',
							collapsed: true,
							items: [{ autogenerate: { directory: 'api/type-aliases' } }],
						},
					],
				},
			],
		}),
	],
});
