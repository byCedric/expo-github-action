import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import os from 'os';
import { Context } from '../context';
import { storeEntry } from './api';
import { getKey } from './utils';

/**
 * Save the Expo CLI to local and remote cache, when enabled.
 * It always returns the local cache path, even when saved on remote cache.
 * When something went wrong, it returns nothing but the output will be set to failed.
 */
export async function toCache(context: Context, dir: string) {
	const localCachePath = await toolCache.cacheDir(dir, 'expo-cli', context.version, os.arch());

	core.info(`cache: saving for ${JSON.stringify({ ...context, dir })}`);
	core.info(`cache: local path ${localCachePath}`);

	if (!context.remoteCache) {
		return;
	}

	const remoteCachekey = getKey(context.version, context.packager);
	let remoteCacheResponse;

	core.info(`cache: remote key ${remoteCachekey}`);

	try {
		remoteCacheResponse = await storeEntry(remoteCachekey, localCachePath);
	} catch (error) {
		core.setFailed(error.message);
	}

	if (remoteCacheResponse) {
		return localCachePath;
	}

	core.info('cache: skipping new cache');
}
