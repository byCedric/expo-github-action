import * as core from '@actions/core';
import * as cli from '@actions/exec';

interface AuthenticateOptions {
	username: string;
	password: string;
}

/**
 * Authenticate at Expo using `expo login`.
 * This step is required for publishing and building new apps.
 * It uses the `EXPO_CLI_PASSWORD` environment variable for improved security.
 */
export async function authenticate(bin: string, options: AuthenticateOptions) {
	if (!options.username || !options.password) {
		return core.debug('Skipping authentication, `expo-username` and/or `expo-password` not set...');
	}

	await cli.exec(bin, ['login', `--username=${options.username}`], {
		env: {
			...process.env,
			EXPO_CLI_PASSWORD: options.password,
		},
	});
}
