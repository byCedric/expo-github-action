const cache = { find: jest.fn(), cacheDir: jest.fn() };
const cli = { exec: jest.fn() };
const io = { mkdirP: jest.fn(), which: jest.fn() };
const registry = { manifest: jest.fn() };

jest.mock('@actions/tool-cache', () => cache);
jest.mock('@actions/exec', () => cli);
jest.mock('@actions/io', () => io);
jest.mock('libnpm', () => registry);

import * as install from '../src/install';

describe('resolve', () => {
	test('fetches exact version of expo-cli', async () => {
		registry.manifest.mockResolvedValue({ version: '3.0.10' });
		expect(await install.resolve('latest')).toBe('3.0.10');
		expect(registry.manifest).toBeCalledWith('expo-cli@latest');
	});
});

describe('install', () => {
	test('installs path from cache', async () => {
		cache.find.mockResolvedValue('/cache/path');
		const expoPath = await install.install('3.0.10', 'npm');
		expect(expoPath).toMatchObject({
			path: '/cache/path/node_modules/.bin',
			bin: '/cache/path/node_modules/.bin/expo',
		});
	});

	test('installs path from packager and cache it', async () => {
		process.env['RUNNER_TEMP'] = '/temp/path';
		cache.find.mockResolvedValue(undefined);
		cache.cacheDir.mockResolvedValue('/cache/path');
		const expoPath = await install.install('3.0.10', 'npm');
		expect(cache.cacheDir).toBeCalledWith('/temp/path', 'expo-cli', '3.0.10');
		expect(expoPath).toMatchObject({
			path: '/cache/path/node_modules/.bin',
			bin: '/cache/path/node_modules/.bin/expo',
		});
	});
});

describe('fromPackager', () => {
	test('resolves tool path', async () => {
		await install.fromPackager('3.0.10', 'npm');
		expect(io.which).toBeCalledWith('npm');
	});

	test('creates temporary folder', async () => {
		process.env['RUNNER_TEMP'] = '/temp/path';
		await install.fromPackager('latest', 'yarn');
		expect(io.mkdirP).toBeCalledWith('/temp/path');
	});

	test('installs expo with tool', async () => {
		process.env['RUNNER_TEMP'] = '/temp/path';
		io.which.mockResolvedValue('npm');
		const expoPath = await install.fromPackager('beta', 'npm');
		expect(expoPath).toBe('/temp/path');
		expect(cli.exec).toBeCalled();
		expect(cli.exec.mock.calls[0][0]).toBe('npm');
		expect(cli.exec.mock.calls[0][1][0]).toBe('add');
		expect(cli.exec.mock.calls[0][1][1]).toBe('expo-cli@beta');
		expect(cli.exec.mock.calls[0][2]).toMatchObject({ cwd: '/temp/path' });
	});
});

describe('fromCache', () => {
	test('uses cache for exact version', async () => {
		cache.find.mockResolvedValue('/cache/expo/path');
		const cachePath = await install.fromCache('3.0.10');
		expect(cache.find).toBeCalledWith('expo-cli', '3.0.10');
		expect(cachePath).toBe('/cache/expo/path');
	});
});

describe('toCache', () => {
	test('uses cache for installed folder', async () => {
		cache.cacheDir.mockResolvedValue('/cache/expo/path');
		const cachePath = await install.toCache('3.0.10', '/expo/install/path');
		expect(cache.cacheDir).toBeCalledWith('/expo/install/path', 'expo-cli', '3.0.10');
		expect(cachePath).toBe('/cache/expo/path');
	});
});
