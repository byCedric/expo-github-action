const core = { addPath: jest.fn(), getInput: jest.fn() };
const exec = { exec: jest.fn() };
const expo = { authenticate: jest.fn() };
const install = { install: jest.fn() };
const system = { patchWatchers: jest.fn() };

jest.mock('@actions/core', () => core);
jest.mock('@actions/exec', () => exec);
jest.mock('../src/expo', () => expo);
jest.mock('../src/install', () => install);
jest.mock('../src/system', () => system);

import { run } from '../src/index';

interface MockInputProps {
	version?: string;
	packager?: string;
	username?: string;
	password?: string;
	patchWatchers?: string;
}

const mockInput = (props: MockInputProps = {}) => {
	// fix: kind of dirty workaround for missing "mock 'value' based on arguments"
	const input = (name: string) => {
		switch (name) {
			case 'expo-version': return props.version || '';
			case 'expo-packager': return props.packager || '';
			case 'expo-username': return props.username || '';
			case 'expo-password': return props.password || '';
			case 'expo-patch-watchers': return props.patchWatchers || '';
			default: return '';
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	core.getInput = input as any;
};

describe('run', () => {
	beforeEach(() => {
		install.install.mockResolvedValue({
			path: '/expo/install/path',
			bin: '/expo/install/path/expo',
		});
	})

	test('installs latest expo-cli with npm by default', async () => {
		await run();
		expect(install.install).toBeCalledWith('latest', 'npm');
	});

	test('installs provided version expo-cli with yarn', async () => {
		mockInput({ version: '3.0.10', packager: 'yarn' });
		await run();
		expect(install.install).toBeCalledWith('3.0.10', 'yarn');
	});

	test('installs path to global path', async () => {
		await run();
		expect(core.addPath).toBeCalledWith('/expo/install/path');
	});

	test('authenticates with provided credentials', async () => {
		mockInput({
			username: 'bycedric',
			password: 'mypassword',
			patchWatchers: 'false',
		});
		await run();
		expect(expo.authenticate).toBeCalledWith('/expo/install/path/expo', {
			username: 'bycedric',
			password: 'mypassword',
		});
	});

	test('patches the system when set to true', async () => {
		mockInput({ patchWatchers: 'true' });
		await run();
		expect(system.patchWatchers).toHaveBeenCalled();
	});

	test('patches the system when not set', async () => {
		mockInput({ patchWatchers: '' });
		await run();
		expect(system.patchWatchers).toHaveBeenCalled();
	});

	test('skips the system patch when set to false', async () => {
		mockInput({ patchWatchers: 'false' });
		await run();
		expect(system.patchWatchers).not.toHaveBeenCalled();
	});
});
