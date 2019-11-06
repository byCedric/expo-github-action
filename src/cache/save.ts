import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import os from 'os';
import { getKey, storeEntry } from './api';

export async function toCache(version: string, packager: string, dir: string, remoteCache: boolean) {
	const localCachePath = await toolCache.cacheDir(dir, 'expo-cli', version, os.arch());

	core.info(`Debug: saving cache for: ${JSON.stringify({ version, packager, dir })}`);
	core.info(`Debug: local cache path: ${localCachePath}`);

	if (!remoteCache) {
		return;
	}

	const remoteCachekey = getKey(version, packager);
	let remoteCacheResponse;

	core.info(`Debug: remote cache key: ${remoteCachekey}`);

	try {
		remoteCacheResponse = await storeEntry(remoteCachekey, localCachePath);
	} catch (error) {
		core.setFailed(error.message);
	}

	if (remoteCacheResponse) {
		return localCachePath;
	}

	core.info('Debug: skipping new cache');
}
