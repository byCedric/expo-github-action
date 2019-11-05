import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import os from 'os';
import path from 'path';
import { getKey, fetchEntry } from './api';

export async function fromCache(version: string, packager: string) {
	const key = getKey(version, packager);
	const localCachePath = toolCache.find('expo-cli', version);

	if (localCachePath) {
		return localCachePath;
	}

	const remoteCachePath = path.join(process.env['RUNNER_TOOL_CACHE'] || '', 'expo-cli', '3.4.1', os.arch());
	let remoteCacheResponse;

	try {
		remoteCacheResponse = await fetchEntry(key, remoteCachePath);
	} catch (error) {
		core.setFailed(error.message);
	}

	if (remoteCacheResponse !== null) {
		return remoteCachePath;
	}
}
