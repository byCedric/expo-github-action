import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import fs from 'fs';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import tar from 'tar';

export interface ArtifactCacheEntry {
	cacheKey?: string;
	scope?: string;
	creationTime?: string;
	archiveLocation?: string;
}

/**
 * A list of error messages used when throwing errors.
 */
export const errors = {
	URL_NOT_FOUND: 'Cache: URL not found, unable to interact with the cache API',
	TOKEN_NOT_FOUND: 'Cache: token not found, unable to authenticate with the cache API',
	ARCHIVE_TOO_BIG: 'Cache: archive is bigger than 200mb, unable to save it: ',
	API_ENTRY_NOT_FOUND: 'Cache: entry not found, unable to restore for key(s): ',
	API_ERROR: 'Cache: API responded with error status: ',
};

/**
 * A list of states used within the API checks.
 */
export const states = {
	CACHE_ENTRY: 'cache-entry',
};

/**
 * Get the cache key based on verion and packager.
 * It also adds the node major version and arch/platform data.
 */
export function getKey(version: string, packager: string) {
	const node = process.version.split('.')[0];

	return `${process.platform}-${os.arch()}-node-${node}-${packager}-expo-cli-${version}`;
}

/**
 * Get the cache API URL from environment.
 * It tries the `ACTIONS_CACHE_URL` or `ACTIONS_RUNTIME_URL` env var as fallback.
 */
function getUrl(path = '') {
	const url = (
		process.env['ACTIONS_CACHE_URL'] ||
		process.env['ACTIONS_RUNTIME_URL'] ||
		''
	).replace('pipelines', 'artifactcache');

	if (url) {
		return url + path;
	}

	throw new Error(errors.URL_NOT_FOUND);
}

/**
 * Get the bearer token from environment.
 * It tries the `ACTIONS_RUNTIME_TOKEN` env var.
 */
function getToken() {
	const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';

	if (token) {
		return token;
	}

	throw new Error(errors.TOKEN_NOT_FOUND);
}

/**
 * Get the path to a temporary directory to safely write files to.
 */
function getTemporaryPath() {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'expo-cli'));
}

/**
 * Validate the archive file to check if we can upload it.
 * The current limitation is 400mb max size.
 */
function validateArchive(archive: string) {
	const MAX_SIZE = 400 * 1024 * 1024; // 400mb
	const archiveSize = fs.statSync(archive).size;

	if (archiveSize > MAX_SIZE) {
		throw new Error(errors.ARCHIVE_TOO_BIG + archiveSize);
	}
}

/**
 * Fetch the cache entry, based on the key, from the cache API.
 * This allows us to fetch a cache entry from another workflow run.
 */
export async function fetchEntry(key: string, target: string): Promise<ArtifactCacheEntry | null> {
	const response = await fetch(
		getUrl(`_apis/artifactcache/cache?keys=${encodeURIComponent(key)}`),
		{
			method: 'get',
			headers: {
				Accept: 'application/json;api-version=5.2-preview.1',
				Authorization: `Bearer ${getToken()}`,
			},
		}
	);

	if (response.status === 204) {
		return null;
	}

	if (response.status !== 200) {
		throw new Error(errors.API_ERROR + response.status);
	}

	const data = await response.json();

	if (!data || !data.archiveLocation) {
		throw new Error(errors.API_ENTRY_NOT_FOUND + key);
	}

	const archiveFile = await toolCache.downloadTool(data.archiveLocation);
	await toolCache.extractTar(archiveFile, target);

	core.saveState(states.CACHE_ENTRY, JSON.stringify(data));

	return data;
}

/**
 * Store a directory or file in the cache API.
 * This allows us to fetch a cache entry from another workflow run.
 */
export async function storeEntry(key: string, target: string): Promise<ArtifactCacheEntry> {
	const cacheEntryRaw = core.getState(states.CACHE_ENTRY);
	const cacheEntry = cacheEntryRaw ? JSON.parse(cacheEntryRaw) : null;

	if (cacheEntry) {
		return cacheEntry;
	}

	const archivePath = path.join(getTemporaryPath(), 'cache.tgz');

	await tar.create({ gzip: true, file: archivePath }, [target]);
	await validateArchive(archivePath);

	const response = await fetch(
		getUrl(`_apis/artifactcache/cache/${encodeURIComponent(key)}`),
		{
			body: fs.createReadStream(archivePath),
			method: 'post',
			headers: {
				Accept: 'application/json;api-version=5.2-preview.1',
				Authorization: `Bearer ${getToken()}`,
				'Content-Type': 'application/octet-stream',
			},
		}
	);

	if (response.status === 204) {
		throw new Error(errors.API_ENTRY_NOT_FOUND + key);
	}

	if (response.status !== 200) {
		throw new Error(errors.API_ERROR + response.status);
	}

	const data = await response.json();

	if (!data || !data.archiveLocation) {
		throw new Error(errors.API_ENTRY_NOT_FOUND + key);
	}

	return data;
}
