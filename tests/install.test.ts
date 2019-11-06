const cache = { fromCache: jest.fn(), toCache: jest.fn() };
const cli = { exec: jest.fn() };
const io = { mkdirP: jest.fn(), which: jest.fn() };
const registry = { manifest: jest.fn() };

jest.mock('@actions/exec', () => cli);
jest.mock('@actions/io', () => io);
jest.mock('libnpm', () => registry);
jest.mock('../src/cache', () => cache);

import { Context } from '../src/context';
import * as install from '../src/install';

describe('resolve', () => {
	test('fetches exact version of expo-cli', async () => {
		registry.manifest.mockResolvedValue({ version: '3.0.10' });
		expect(await install.resolve('latest')).toBe('3.0.10');
		expect(registry.manifest).toBeCalledWith('expo-cli@latest');
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

describe('install', () => {
	const context: Context = {
		version: '3.0.10',
		packager: 'npm',
		remoteCache: false,
		patchWatchers: false,
	};

	test('installs from cache', async () => {
		cache.fromCache.mockReturnValue('/cache/path');
		const expoPath = await install.install(context);
		expect(expoPath).toBe('/cache/path/node_modules/.bin');
	});

	test('installs from packager and stores cache', async () => {
		process.env['RUNNER_TEMP'] = '/temp/path';
		cache.fromCache.mockResolvedValue(undefined);
		cache.toCache.mockResolvedValue('/cache/path');
		const expoPath = await install.install(context);
		expect(expoPath).toBe('/cache/path/node_modules/.bin');
		expect(cache.toCache).toBeCalledWith(context, '/temp/path');
	});
});
