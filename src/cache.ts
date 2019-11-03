import path from 'path';
import os from 'os';
import fs from 'fs';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as cli from '@actions/exec';
import * as toolCache from '@actions/tool-cache';
import fetch from 'node-fetch';

const key = 'T1-win32-x64-node-12-yarn-expo-cli-3.4.1';

/**
 * Get the path to the `expo-cli` from cache, if any.
 * Before pulling the cache from tool cache, but that's not available cross jobs.
 * It uses an unoffical way to save and restore the cache using the `actions/cache`'s code.
 */
export async function fromCache(version: string) {
	let root = toolCache.find('expo-cli', version);
	let cacheEntry: ArtifactCacheEntry;

	if (root) {
		return root;
	} else {
		const cacheRoot = process.env['RUNNER_TOOL_CACHE'] || '';
		root = path.join(cacheRoot, 'expo-cli', '3.4.1', os.arch());
	}

	try {
		cacheEntry = await _getCacheEntry([key]);
	} catch {
		return '';
	}

	const archiveFile = await toolCache.downloadTool(cacheEntry.archiveLocation!);

	await toolCache.extractTar(archiveFile, root);

	core.saveState('CACHE_KEY', key);
	core.saveState('CACHE_RESULT', JSON.stringify(cacheEntry));

	return root;
}

/**
 * Store the root of `expo-cli` in the cache, for future reuse.
 * Before pushing the cache to tool cache, but that's not available cross jobs.
 * It uses an unoffical way to save and restore the cache using the `actions/cache`'s code.
 */
export async function toCache(version: string, dir: string) {
	const root = await toolCache.cacheDir(dir, 'expo-cli', version);
	const cacheEntryFromState = JSON.parse(core.getState('CACHE_RESULT')) as ArtifactCacheEntry;

	if (_isExactKeyMatch(key, cacheEntryFromState)) {
		core.info(`Cache hit occured on ${key}, skipping cache...`);
		return root;
	}

	let cachePath = root;
	const tempPath = path.join(process.env['RUNNER_TEMP'] || '', 'expo-cli', '3.4.1', os.arch());
	let archiveFile = path.join(tempPath, 'cache.tgz');

	const args = ['-cz'];
	const IS_WINDOWS = process.platform === 'win32';
	if (IS_WINDOWS) {
		args.push('--force-local');
		archiveFile = archiveFile.replace(/\\/g, '/');
		cachePath = cachePath.replace(/\\/g, '/');
	}
	args.push(...['-f', archiveFile, '-C', cachePath, '.']);
	const tarPath = await io.which("tar", true);
	await cli.exec(`"${tarPath}"`, args);

	const fileSizeLimit = 200 * 1024 * 1024; // 200MB
	const archiveFileSize = fs.statSync(archiveFile).size;
	if (archiveFileSize > fileSizeLimit) {
		core.warning(`Cache size of ${archiveFileSize} bytes is over the 200MB limit, not saving cache`);
		return root;
	}

	await _saveCacheEntry(key, archiveFile);

	return root;
}

interface ArtifactCacheEntry {
	cacheKey?: string;
	scope?: string;
	creationTime?: string;
	archiveLocation?: string;
}

function _isExactKeyMatch(key: string, cacheResult?: ArtifactCacheEntry) {
	return !!(
		cacheResult &&
		cacheResult.cacheKey &&
		cacheResult.cacheKey.localeCompare(key, undefined, { sensitivity: 'accent' }) === 0
	);
}

function _getCacheUrl() {
	const cacheUrl = (
		process.env["ACTIONS_CACHE_URL"] ||
		process.env["ACTIONS_RUNTIME_URL"] ||
		""
	).replace("pipelines", "artifactcache");

	if (!cacheUrl) {
		throw new Error('Cache Service Url not found, unable to restore cache');
	}

	return cacheUrl;
}

async function _getCacheEntry(keys: string[]): Promise<ArtifactCacheEntry> {
	const cacheUrl = _getCacheUrl();
	const cachePath = `_apis/artifactcache/cache?keys=${encodeURIComponent(keys.join(','))}`;
	const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';

	const response = await fetch(`${cacheUrl}${cachePath}`, {
		method: 'get',
		headers: {
			Accept: 'application/json;api-version=5.2-preview.1',
			Authorization: `Bearer ${token}`,
		},
	});

	if (response.status === 204) {
		throw new Error(`Cache not found for keys: ${JSON.stringify(keys)}`);
	}

	if (response.status !== 200) {
		throw new Error(`Cache service responded with ${response.status}`);
	}

	const json = await response.json();

	if (!json || !json.cacheResult.archiveLocation) {
		throw new Error('Cache not found');
	}

	return json;
}

async function _saveCacheEntry(key: string, archive: string) {
	const cacheUrl = _getCacheUrl();
	const cachePath = `_apis/artifactcache/cache/${encodeURIComponent(key)}`;
	const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';

	const response = await fetch(`${cacheUrl}${cachePath}`, {
		method: 'post',
		body: fs.createReadStream(archive),
		headers: {
			Accept: 'application/json;api-version=5.2-preview.1',
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/octet-stream',
		},
	});

	if (response.status !== 200) {
		throw new Error(`Cache service responded with ${response.status}`);
	}

	core.info('Cache saved successfully');
}
