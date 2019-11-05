import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import os from 'os';
import { getKey, storeEntry } from './api';

export async function toCache(version: string, packager: string, dir: string) {
	const key = getKey(version, packager);
	const localCachePath = await toolCache.cacheDir(dir, 'expo-cli', version, os.arch());

	let remoteCacheResponse;

	try {
		remoteCacheResponse = await storeEntry(key, localCachePath);
	} catch (error) {
		core.setFailed(error.message);
	}

	if (remoteCacheResponse !== null) {
		return localCachePath;
	}
}
