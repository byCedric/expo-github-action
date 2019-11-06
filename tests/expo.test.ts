const core = { debug: jest.fn() };
const cli = { exec: jest.fn() };

jest.mock('@actions/core', () => core);
jest.mock('@actions/exec', () => cli);

import * as expo from '../src/expo';
import { setPlatform, resetPlatform } from './utils';

describe('authenticate', () => {
	test('skips authentication without credentials', async () => {
		await expo.authenticate();
		expect(cli.exec).not.toBeCalled();
		expect(core.debug).toBeCalled();
	});

	test('skips authentication without password', async () => {
		await expo.authenticate({ username: 'bycedric' });
		expect(cli.exec).not.toBeCalled();
		expect(core.debug).toBeCalled();
	});

	test('executes login command with password through environment', async () => {
		process.env['TEST_INCLUDED'] = 'hellyeah';
		await expo.authenticate({ username: 'bycedric',  password: 'mypassword' });
		expect(cli.exec).toBeCalled();
		expect(cli.exec.mock.calls[0][0]).toBe('expo');
		expect(cli.exec.mock.calls[0][1][0]).toBe('login')
		expect(cli.exec.mock.calls[0][1][1]).toBe('--username=bycedric');
		expect(cli.exec.mock.calls[0][2]).toMatchObject({
			env: {
				TEST_INCLUDED: 'hellyeah',
				EXPO_CLI_PASSWORD: 'mypassword',
			},
		});
	});

	test('executes login command with `.cmd` suffix on windows', async () => {
		setPlatform('win32');
		await expo.authenticate({ username: 'bycedric', password: 'mypassword' });
		expect(cli.exec).toBeCalled();
		expect(cli.exec.mock.calls[0][0]).toBe('expo.cmd');
		resetPlatform();
	});
});
