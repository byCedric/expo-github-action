import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import os from 'os';
import path from 'path';
import { Context } from '../context';
import { fetchEntry } from './api';
import { getKey } from './utils';

/**
 * Restore the context from local or remote cache, when enabled.
 * It returns the path where the tool was restored, when restored.
 */
export async function fromCache(context: Context) {
	const localCachePath = toolCache.find('expo-cli', context.version);

	core.info(`cache: restoring for ${JSON.stringify(context)}`);
	core.info(`cache: local path ${localCachePath}`);

	if (localCachePath) {
		return localCachePath;
	}

	if (!context.remoteCache) {
		return;
	}

	const remoteCacheKey = getKey(context.version, context.packager);
	const remoteCachePath = path.join(process.env['RUNNER_TOOL_CACHE'] || '', 'expo-cli', context.version, os.arch());
	let remoteCacheResponse;

	core.info(`cache: remote key ${remoteCacheKey}`);
	core.info(`cache: remote path ${remoteCachePath}`);

	try {
		remoteCacheResponse = await fetchEntry(remoteCacheKey, remoteCachePath);
	} catch (error) {
		core.setFailed(error.message);
	}

	if (remoteCacheResponse) {
		return remoteCachePath;
	}

	core.info(`cache: remote response empty`);
}
