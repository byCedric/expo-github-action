import * as core from '@actions/core';
import * as io from '@actions/io';
import * as toolCache from '@actions/tool-cache';
import fs from 'fs';
import fetch from 'node-fetch';
import tar from 'tar';
import * as utils from './utils';

/**
 * Fetch the cache entry, based on the key, from the cache API.
 * This allows us to fetch a cache entry from another workflow run.
 * It returns false when no cache was found, true when it's restored.
 */
export async function fetchEntry(key: string, target: string) {
	const response = await fetch(
		utils.getUrl(`_apis/artifactcache/cache?keys=${encodeURIComponent(key)}`),
		{
			method: 'get',
			headers: {
				Accept: 'application/json;api-version=5.2-preview.1',
				Authorization: `Bearer ${utils.getToken()}`,
			},
		}
	);

	if (response.status === 204) {
		return false;
	}

	if (response.status !== 200) {
		throw new Error(utils.errors.API_ERROR + response.status);
	}

	const data = await response.json();

	if (!data || !data.archiveLocation) {
		throw new Error(utils.errors.API_ENTRY_NOT_FOUND + key);
	}

	const archiveFile = await toolCache.downloadTool(data.archiveLocation);

	await io.mkdirP(target);
	await toolCache.extractTar(archiveFile, target);

	core.saveState(utils.states.CACHE_ENTRY, JSON.stringify(data));

	return true;
}

/**
 * Store a directory in the cache API.
 * This allows us to fetch a cache entry from another workflow run.
 * It returns false when a previously restored cache was found, true when a new cache is stored.
 */
export async function storeEntry(key: string, target: string) {
	const cacheEntryRaw = core.getState(utils.states.CACHE_ENTRY);
	const cacheEntry = cacheEntryRaw ? JSON.parse(cacheEntryRaw) : null;

	if (cacheEntry) {
		return false;
	}

	const archivePath = utils.getTemporaryPath('cache.tgz');

	await tar.create({ gzip: true, file: archivePath, cwd: target }, ['node_modules']);
	await utils.validateArchive(archivePath);

	const response = await fetch(
		utils.getUrl(`_apis/artifactcache/cache/${encodeURIComponent(key)}`),
		{
			body: fs.createReadStream(archivePath),
			method: 'post',
			headers: {
				Accept: 'application/json;api-version=5.2-preview.1',
				Authorization: `Bearer ${utils.getToken()}`,
				'Content-Type': 'application/octet-stream',
			},
		}
	);

	if (response.status === 204) {
		throw new Error(utils.errors.API_ENTRY_NOT_FOUND + key);
	}

	if (response.status !== 200) {
		throw new Error(utils.errors.API_ERROR + response.status);
	}

	return true;
}
