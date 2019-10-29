import { addPath, getInput } from '@actions/core';
import { authenticate } from './expo';
import { install } from './install';
import { patchWatchers } from './system';

export async function run() {
	const { path, bin } = await install(
		getInput('expo-version') || 'latest',
		getInput('expo-packager') || 'npm',
	);

	addPath(path);

	await authenticate(bin, {
		username: getInput('expo-username'),
		password: getInput('expo-password'),
	});

	const shouldPatchWatchers = getInput('expo-patch-watchers') || 'true';

	if (shouldPatchWatchers !== 'false') {
		await patchWatchers();
	}
}

run();
