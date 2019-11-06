import { getInput } from '@actions/core';

export type PackagerContext = 'npm' | 'yarn';

export interface Context {
	/** The Expo CLI version to install */
	version: string;
	/** The packager to install Expo CLI with */
	packager: PackagerContext;
	/** If remote cache should be used or not (HIGHLY EXPERIMENTAL) */
	remoteCache: boolean;
	/** If the inotify watchers should be patched (on Linux only) */
	patchWatchers: boolean;
}

export interface Authentication {
	/** The Expo CLI username to authenticate with */
	username?: string;
	/** The Expo CLI password to authenticate with */
	password?: string;
}

/**
 * Get the context of the action, based on input.
 */
export function getContext(): Context {
	return {
		version: getInput('expo-version') || 'latest',
		packager: (getInput('expo-packager') || 'npm') as PackagerContext,
		remoteCache: (getInput('expo-remote-cache') || 'false') === 'true',
		patchWatchers: (getInput('expo-patch-watchers') || 'true') === 'true',
	};
}

/**
 * Get the authentiction info, based on input.
 * It's separated from the normal context for security reasons.
 */
export function getAuthentication(): Authentication {
	const username = getInput('expo-username').trim();
	const password = getInput('expo-password').trim();

	return {
		username: username || undefined,
		password: password || undefined,
	};
}
