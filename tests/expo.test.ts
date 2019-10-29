const core = { debug: jest.fn() };
const cli = { exec: jest.fn() };

jest.mock('@actions/core', () => core);
jest.mock('@actions/exec', () => cli);

import * as expo from '../src/expo';

const bin = '/path/to/expo';

describe('authenticate', () => {
	test('skips authentication without credentials', async () => {
		await expo.authenticate(bin, { username: '', password: '' });
		expect(cli.exec).not.toBeCalled();
		expect(core.debug).toBeCalled();
	});

	test('skips authentication without password', async () => {
		await expo.authenticate(bin, { username: 'bycedric', password: '' });
		expect(cli.exec).not.toBeCalled();
		expect(core.debug).toBeCalled();
	});

	test('executes login command with password through environment', async () => {
		process.env['TEST_INCLUDED'] = 'hellyeah';
		await expo.authenticate(bin, { username: 'bycedric', password: 'mypassword' });
		expect(cli.exec).toBeCalled();
		expect(cli.exec.mock.calls[0][0]).toBe(bin);
		expect(cli.exec.mock.calls[0][1][0]).toBe('login')
		expect(cli.exec.mock.calls[0][1][1]).toBe('--username=bycedric');
		expect(cli.exec.mock.calls[0][2]).toMatchObject({
			env: {
				TEST_INCLUDED: 'hellyeah',
				EXPO_CLI_PASSWORD: 'mypassword',
			},
		});
	});
});
