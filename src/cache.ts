import path from 'path';
import os from 'os';
import fs from 'fs';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as cli from '@actions/exec';
import * as toolCache from '@actions/tool-cache';
import * as cacheHttpClient from '@actions/cache/src/cacheHttpClient';
import * as utils from '@actions/cache/src/utils/actionUtils';
import { State } from '@actions/cache/src/constants';

/**
 * Get the path to the `expo-cli` from cache, if any.
 * Before pulling the cache from tool cache, but that's not available cross jobs.
 * It uses an unoffical way to save and restore the cache using the `actions/cache`'s code.
 */
export async function fromCache(version: string) {
	let root = toolCache.find('expo-cli', version);

	if (root) {
		return root;
	} else {
		const cacheRoot = process.env['RUNNER_TOOL_CACHE'] || '';
		root = path.join(cacheRoot, 'expo-cli', '3.4.1', os.arch());
	}

	const key = 'win32-node-12-yarn-expo-cli-3.4.1';
	const archivePath = path.join(
		await utils.createTempDirectory(),
		'cache.tgz',
	);

	const cacheEntry = await cacheHttpClient.getCacheEntry([key]);
	await cacheHttpClient.downloadCache(cacheEntry, archivePath);

	utils.setCacheState(cacheEntry);
	await toolCache.extractTar(archivePath, root);

	core.saveState(State.CacheKey, key);

	utils.setCacheState(cacheEntry);
	utils.setCacheHitOutput(
		utils.isExactKeyMatch(key, cacheEntry)
	);

	return root;
}

/**
 * Store the root of `expo-cli` in the cache, for future reuse.
 * Before pushing the cache to tool cache, but that's not available cross jobs.
 * It uses an unoffical way to save and restore the cache using the `actions/cache`'s code.
 */
export async function toCache(version: string, dir: string) {
	const key = 'win32-node-12-yarn-expo-cli-3.4.1';
	const root = await toolCache.cacheDir(dir, 'expo-cli', version);

	if (utils.isExactKeyMatch(key, utils.getCacheState())) {
		core.info(`Cache hit occured on ${key}, skipping cache...`);
		return root;
	}

	let cachePath = root;
	let archivePath = path.join(
		await utils.createTempDirectory(),
		'cache.tgz',
	);

	const args = ['-cz'];
	const IS_WINDOWS = process.platform === 'win32';
	if (IS_WINDOWS) {
		args.push('--force-local');
		archivePath = archivePath.replace(/\\/g, '/');
		cachePath = cachePath.replace(/\\/g, '/');
	}
	args.push(...['-f', archivePath, '-C', cachePath, '.']);
	const tarPath = await io.which("tar", true);
	await cli.exec(`"${tarPath}"`, args);

	const fileSizeLimit = 200 * 1024 * 1024; // 200MB
	const archiveFileSize = fs.statSync(archivePath).size;
	if (archiveFileSize > fileSizeLimit) {
		core.warning(`Cache size of ${archiveFileSize} bytes is over the 200MB limit, not saving cache`);
		return root;
	}

	const stream = fs.createReadStream(archivePath);
	await cacheHttpClient.saveCache(stream, key);

	return root;
}
