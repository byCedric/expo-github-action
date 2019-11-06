import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import os from 'os';
import path from 'path';
import { getKey, fetchEntry } from './api';

export async function fromCache(version: string, packager: string) {
	core.info(`Debug: restoring cache for: ${JSON.stringify({ version, packager })}`);

	const key = getKey(version, packager);

	core.info(`Debug: cache key: ${key}`);

	const localCachePath = toolCache.find('expo-cli', version);

	core.info(`Debug: local cache path: ${localCachePath}`);

	if (localCachePath) {
		core.info(`Debug: local cache found`);
		return localCachePath;
	}

	const remoteCachePath = path.join(process.env['RUNNER_TOOL_CACHE'] || '', 'expo-cli', '3.4.1', os.arch());

	core.info(`Debug: remote cache path: ${remoteCachePath}`);

	let remoteCacheResponse;

	try {
		remoteCacheResponse = await fetchEntry(key, remoteCachePath);
		core.info(`Debug: remote cache response: ${JSON.stringify(remoteCacheResponse)}`);
	} catch (error) {
		core.setFailed(error.message);
		core.info(`Debug: remote cache failed: ${error.message}`);
	}

	if (!remoteCacheResponse) {
		core.info(`Debug: remote cache restored to ${remoteCachePath}`);
		return remoteCachePath;
	}

	core.info(`Debug: remote cache response empty`);
}
