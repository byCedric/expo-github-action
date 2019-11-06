"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
/**
 * Get the context of the action, based on input.
 */
function getContext() {
    return {
        version: core_1.getInput('expo-version') || 'latest',
        packager: (core_1.getInput('expo-packager') || 'npm'),
        remoteCache: (core_1.getInput('expo-remote-cache') || 'false') === 'true',
        patchWatchers: (core_1.getInput('expo-patch-watchers') || 'true') === 'true',
    };
}
exports.getContext = getContext;
/**
 * Get the authentiction info, based on input.
 * It's separated from the normal context for security reasons.
 */
function getAuthentication() {
    const username = core_1.getInput('expo-username').trim();
    const password = core_1.getInput('expo-password').trim();
    return {
        username: username || undefined,
        password: password || undefined,
    };
}
exports.getAuthentication = getAuthentication;
