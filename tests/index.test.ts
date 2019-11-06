const context = { getAuthentication: jest.fn(), getContext: jest.fn() };
const core = { addPath: jest.fn() };
const exec = { exec: jest.fn() };
const expo = { authenticate: jest.fn() };
const install = { install: jest.fn() };
const system = { patchWatchers: jest.fn() };

jest.mock('@actions/core', () => core);
jest.mock('@actions/exec', () => exec);
jest.mock('../src/context', () => context);
jest.mock('../src/expo', () => expo);
jest.mock('../src/install', () => install);
jest.mock('../src/system', () => system);

import { run } from '../src/index';

describe('run', () => {
	test('installs from context', async () => {
		const ctx = { version: '3.0.10', packager: 'yarn' };
		context.getContext.mockReturnValue(ctx);
		await run();
		expect(install.install).toBeCalledWith(ctx);
	});

	test('installs path to global path', async () => {
		install.install.mockResolvedValue('/expo/install/path');
		await run();
		expect(core.addPath).toBeCalledWith('/expo/install/path');
	});

	test('patches the system when set to true', async () => {
		const ctx = { patchWatchers: true };
		context.getContext.mockReturnValue(ctx);
		await run();
		expect(system.patchWatchers).toHaveBeenCalled();
	});

	test('skips the system patch when set to false', async () => {
		const ctx = { patchWatchers: false };
		context.getContext.mockReturnValue(ctx);
		await run();
		expect(system.patchWatchers).not.toHaveBeenCalled();
	});

	test('authenticates from authentication context', async () => {
		const auth = { username: 'bycedric', password: 'mypassword' };
		context.getAuthentication.mockReturnValue(auth);
		await run();
		expect(expo.authenticate).toBeCalledWith(auth);
	});
});
