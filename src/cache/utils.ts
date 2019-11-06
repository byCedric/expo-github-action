import * as core from '@actions/core';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import os from 'os';

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

	return `T3-${process.platform}-${os.arch()}-node-${node}-${packager}-expo-cli-${version}`;
}

/**
 * Get the cache API URL from environment.
 * It tries the `ACTIONS_CACHE_URL` or `ACTIONS_RUNTIME_URL` env var as fallback.
 */
export function getUrl(urlPath = '') {
	const urlHost = (
		process.env['ACTIONS_CACHE_URL'] ||
		process.env['ACTIONS_RUNTIME_URL'] ||
		''
	).replace('pipelines', 'artifactcache');

	if (urlHost) {
		return urlHost + urlPath;
	}

	throw new Error(errors.URL_NOT_FOUND);
}

/**
 * Get the bearer token from environment.
 * It tries the `ACTIONS_RUNTIME_TOKEN` env var.
 */
export function getToken() {
	const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';

	if (token) {
		return token;
	}

	throw new Error(errors.TOKEN_NOT_FOUND);
}

/**
 * Get the path to a temporary directory to safely write files to.
 * You can add a filename that's added to the temporary path.
 */
export function getTemporaryPath(file = '') {
	return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'expo-cli-')), file);
}

/**
 * Validate the archive file to check if we can upload it.
 * The current limitation is 400mb max size.
 */
export function validateArchive(archive: string) {
	const MAX_SIZE = 400 * 1024 * 1024; // 400mb
	const archiveSize = fs.statSync(archive).size;

	core.info(`Cache: remote cache archive size is ${archiveSize}`);

	if (archiveSize > MAX_SIZE) {
		throw new Error(errors.ARCHIVE_TOO_BIG + archiveSize);
	}
}

/**
 * Download an archive using the absolute URL.
 * It returns a temporary path to the archive file.
 */
export async function downloadArchive(url: string) {
	const path = getTemporaryPath('cache.tgz');
	const response = await fetch(url);

	await new Promise((resolve, reject) => {
		const stream = fs.createWriteStream(path);

		response.body.pipe(stream);
		response.body.on('error', reject);
		stream.on('finish', resolve);
	});

	return path;
}
