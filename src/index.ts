import { addPath } from '@actions/core';
import { getAuthentication, getContext } from './context';
import { authenticate } from './expo';
import { install } from './install';
import { patchWatchers } from './system';

export async function run() {
	const context = getContext();
	const path = await install(context);

	addPath(path);

	await authenticate(getAuthentication());

	if (context.patchWatchers) {
		await patchWatchers();
	}
}

run();
