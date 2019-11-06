import * as cli from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';
import { Context } from './context';
import { fromCache, toCache } from './cache';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const registry = require('libnpm');

/**
 * Resolve the provided semver to exact version of `expo-cli`.
 * This uses the npm registry and accepts latest, dist-tags or version ranges.
 * It's used to determine the cached version of `expo-cli`.
 */
export async function resolve(version: string) {
	return (await registry.manifest(`expo-cli@${version}`)).version;
}

/**
 * Install `expo-cli`, by version, using npm or yarn.
 * It creates a temporary directory to store all required files.
 */
export async function fromPackager(version: string, packager: string) {
	const root = process.env['RUNNER_TEMP'] || '';
	const tool = await io.which(packager);

	await io.mkdirP(root);
	await cli.exec(tool, ['add', `expo-cli@${version}`], { cwd: root });

	return root;
}

/**
 * Install `expo-cli`, by version, using the packager.
 * Here you can provide any semver range or dist tag used in the registry.
 * It returns the path where Expo is installed.
 */
export async function install(context: Context) {
	const version = await resolve(context.version);
	let root = await fromCache({ ...context, version });

	if (!root) {
		const installPath = await fromPackager(version, context.packager);
		const cachePath = await toCache({ ...context, version }, installPath);

		root = cachePath || installPath;
	}

	return path.join(root, 'node_modules', '.bin');
}
