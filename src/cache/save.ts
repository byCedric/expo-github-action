import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import os from 'os';
import { getKey, storeEntry } from './api';

export async function toCache(version: string, packager: string, dir: string) {
	core.info(`Debug: saving cache for: ${JSON.stringify({ version, packager, dir })}`);

	const key = getKey(version, packager);

	core.info(`Debug: cache key: ${key}`);

	const localCachePath = await toolCache.cacheDir(dir, 'expo-cli', version, os.arch());

	core.info(`Debug: local cache path: ${localCachePath}`);

	let remoteCacheResponse;

	try {
		remoteCacheResponse = await storeEntry(key, localCachePath);
		core.info(`Debug: remote cache response: ${JSON.stringify(remoteCacheResponse)}`);
	} catch (error) {
		core.setFailed(error.message);
		core.info(`Debug: remote cache failed: ${error.message}`);
	}

	if (remoteCacheResponse) {
		core.info(`Debug: remote cache saved from local cache path: ${localCachePath}`);
		return localCachePath;
	}

	core.info(`Debug: remote cache response empty`);
}
