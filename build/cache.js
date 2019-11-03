"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const cli = __importStar(require("@actions/exec"));
const toolCache = __importStar(require("@actions/tool-cache"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const key = 'T1-win32-x64-node-12-yarn-expo-cli-3.4.1';
/**
 * Get the path to the `expo-cli` from cache, if any.
 * Before pulling the cache from tool cache, but that's not available cross jobs.
 * It uses an unoffical way to save and restore the cache using the `actions/cache`'s code.
 */
function fromCache(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let root = toolCache.find('expo-cli', version);
        let cacheEntry;
        if (root) {
            return root;
        }
        else {
            const cacheRoot = process.env['RUNNER_TOOL_CACHE'] || '';
            root = path_1.default.join(cacheRoot, 'expo-cli', '3.4.1', os_1.default.arch());
        }
        try {
            cacheEntry = yield _getCacheEntry([key]);
        }
        catch (_a) {
            return '';
        }
        const archiveFile = yield toolCache.downloadTool(cacheEntry.archiveLocation);
        yield toolCache.extractTar(archiveFile, root);
        core.saveState('CACHE_KEY', key);
        core.saveState('CACHE_RESULT', JSON.stringify(cacheEntry));
        return root;
    });
}
exports.fromCache = fromCache;
/**
 * Store the root of `expo-cli` in the cache, for future reuse.
 * Before pushing the cache to tool cache, but that's not available cross jobs.
 * It uses an unoffical way to save and restore the cache using the `actions/cache`'s code.
 */
function toCache(version, dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const root = yield toolCache.cacheDir(dir, 'expo-cli', version);
        const cacheEntryFromState = JSON.parse(core.getState('CACHE_RESULT'));
        if (_isExactKeyMatch(key, cacheEntryFromState)) {
            core.info(`Cache hit occured on ${key}, skipping cache...`);
            return root;
        }
        let cachePath = root;
        const tempPath = path_1.default.join(process.env['RUNNER_TEMP'] || '', 'expo-cli', '3.4.1', os_1.default.arch());
        let archiveFile = path_1.default.join(tempPath, 'cache.tgz');
        const args = ['-cz'];
        const IS_WINDOWS = process.platform === 'win32';
        if (IS_WINDOWS) {
            args.push('--force-local');
            archiveFile = archiveFile.replace(/\\/g, '/');
            cachePath = cachePath.replace(/\\/g, '/');
        }
        args.push(...['-f', archiveFile, '-C', cachePath, '.']);
        const tarPath = yield io.which("tar", true);
        yield cli.exec(`"${tarPath}"`, args);
        const fileSizeLimit = 200 * 1024 * 1024; // 200MB
        const archiveFileSize = fs_1.default.statSync(archiveFile).size;
        if (archiveFileSize > fileSizeLimit) {
            core.warning(`Cache size of ${archiveFileSize} bytes is over the 200MB limit, not saving cache`);
            return root;
        }
        yield _saveCacheEntry(key, archiveFile);
        return root;
    });
}
exports.toCache = toCache;
function _isExactKeyMatch(key, cacheResult) {
    return !!(cacheResult &&
        cacheResult.cacheKey &&
        cacheResult.cacheKey.localeCompare(key, undefined, { sensitivity: 'accent' }) === 0);
}
function _getCacheUrl() {
    const cacheUrl = (process.env["ACTIONS_CACHE_URL"] ||
        process.env["ACTIONS_RUNTIME_URL"] ||
        "").replace("pipelines", "artifactcache");
    if (!cacheUrl) {
        throw new Error('Cache Service Url not found, unable to restore cache');
    }
    return cacheUrl;
}
function _getCacheEntry(keys) {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheUrl = _getCacheUrl();
        const cachePath = `_apis/artifactcache/cache?keys=${encodeURIComponent(keys.join(','))}`;
        const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';
        const response = yield node_fetch_1.default(`${cacheUrl}${cachePath}`, {
            method: 'get',
            headers: {
                Accept: 'application/json;api-version=5.2-preview.1',
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 204) {
            throw new Error(`Cache not found for keys: ${JSON.stringify(keys)}`);
        }
        if (response.status !== 200) {
            throw new Error(`Cache service responded with ${response.status}`);
        }
        const json = yield response.json();
        if (!json || !json.cacheResult.archiveLocation) {
            throw new Error('Cache not found');
        }
        return json;
    });
}
function _saveCacheEntry(key, archive) {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheUrl = _getCacheUrl();
        const cachePath = `_apis/artifactcache/cache/${encodeURIComponent(key)}`;
        const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';
        const response = yield node_fetch_1.default(`${cacheUrl}${cachePath}`, {
            method: 'post',
            body: fs_1.default.createReadStream(archive),
            headers: {
                Accept: 'application/json;api-version=5.2-preview.1',
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/octet-stream',
            },
        });
        if (response.status !== 200) {
            throw new Error(`Cache service responded with ${response.status}`);
        }
        core.info('Cache saved successfully');
    });
}
