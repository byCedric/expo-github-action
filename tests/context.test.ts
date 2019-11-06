const core = { getInput: jest.fn() };
jest.mock('@actions/core', () => core);

import { getAuthentication, getContext } from '../src/context';

interface MockInputProps {
	version?: string;
	packager?: string;
	username?: string;
	password?: string;
	remoteCache?: string;
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
			case 'expo-remote-cache': return props.remoteCache || '';
			case 'expo-patch-watchers': return props.patchWatchers || '';
			default: return '';
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	core.getInput = input as any;
};

describe('getContext', () => {
	it('returns context with expected defaults', () => {
		mockInput();
		expect(getContext()).toMatchObject({
			version: 'latest',
			packager: 'npm',
			remoteCache: false,
			patchWatchers: true,
		});
	});

	it('returns context with custom version', () => {
		mockInput({ version: '3.4.1' });
		expect(getContext()).toMatchObject({ version: '3.4.1' });
	});

	it('returns context with custom packager', () => {
		mockInput({ packager: 'yarn' });
		expect(getContext()).toMatchObject({ packager: 'yarn' });
	});

	it('returns context with remote cache when set to true', () => {
		mockInput({ remoteCache: 'true' });
		expect(getContext()).toMatchObject({ remoteCache: true });
	});

	it('returns context without remote cache when set to false', () => {
		mockInput({ remoteCache: 'false' });
		expect(getContext()).toMatchObject({ remoteCache: false });
	});

	it('returns context with patch watchers when set to true', () => {
		mockInput({ patchWatchers: 'true' });
		expect(getContext()).toMatchObject({ patchWatchers: true });
	});

	it('returns context without patch watchers when set to false', () => {
		mockInput({ patchWatchers: 'false' });
		expect(getContext()).toMatchObject({ patchWatchers: false });
	});
});

describe('getAuthentication', () => {
	it('returns auth with expected defaults', () => {
		mockInput();
		expect(getAuthentication()).toMatchObject({
			username: undefined,
			password: undefined,
		});
	});

	it('returns auth with custom username', () => {
		mockInput({ username: 'bycedric' });
		expect(getAuthentication()).toMatchObject({ username: 'bycedric' });
	});

	it('returns auth with custom password', () => {
		mockInput({ password: 'mypass' });
		expect(getAuthentication()).toMatchObject({ password: 'mypass' });
	});
});
