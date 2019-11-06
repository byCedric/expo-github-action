import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import os from 'os';
import path from 'path';
import { getKey, fetchEntry } from './api';

export async function fromCache(version: string, packager: string, remoteCache: boolean) {
	const localCachePath = toolCache.find('expo-cli', version);

	core.info(`Debug: restoring cache for: ${JSON.stringify({ version, packager })}`);
	core.info(`Debug: local cache path: ${localCachePath}`);

	if (localCachePath) {
		return localCachePath;
	}

	if (!remoteCache) {
		return;
	}

	const remoteCacheKey = getKey(version, packager);
	const remoteCachePath = path.join(process.env['RUNNER_TOOL_CACHE'] || '', 'expo-cli', '3.4.1', os.arch());
	let remoteCacheResponse;

	core.info(`Debug: remote cache key: ${remoteCacheKey}`);
	core.info(`Debug: remote cache path: ${remoteCachePath}`);

	try {
		remoteCacheResponse = await fetchEntry(remoteCacheKey, remoteCachePath);
	} catch (error) {
		core.setFailed(error.message);
	}

	if (remoteCacheResponse) {
		return remoteCachePath;
	}

	core.info(`Debug: remote cache response empty`);
}
