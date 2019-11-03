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
const cacheHttpClient = __importStar(require("@actions/cache/src/cacheHttpClient"));
const utils = __importStar(require("@actions/cache/src/utils/actionUtils"));
const constants_1 = require("@actions/cache/src/constants");
/**
 * Get the path to the `expo-cli` from cache, if any.
 * Before pulling the cache from tool cache, but that's not available cross jobs.
 * It uses an unoffical way to save and restore the cache using the `actions/cache`'s code.
 */
function fromCache(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let root = toolCache.find('expo-cli', version);
        if (root) {
            return root;
        }
        else {
            const cacheRoot = process.env['RUNNER_TOOL_CACHE'] || '';
            root = path_1.default.join(cacheRoot, 'expo-cli', '3.4.1', os_1.default.arch());
        }
        const key = 'win32-node-12-yarn-expo-cli-3.4.1';
        const archivePath = path_1.default.join(yield utils.createTempDirectory(), 'cache.tgz');
        const cacheEntry = yield cacheHttpClient.getCacheEntry([key]);
        yield cacheHttpClient.downloadCache(cacheEntry, archivePath);
        utils.setCacheState(cacheEntry);
        yield toolCache.extractTar(archivePath, root);
        core.saveState(constants_1.State.CacheKey, key);
        utils.setCacheState(cacheEntry);
        utils.setCacheHitOutput(utils.isExactKeyMatch(key, cacheEntry));
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
        const key = 'win32-node-12-yarn-expo-cli-3.4.1';
        const root = yield toolCache.cacheDir(dir, 'expo-cli', version);
        if (utils.isExactKeyMatch(key, utils.getCacheState())) {
            core.info(`Cache hit occured on ${key}, skipping cache...`);
            return root;
        }
        let cachePath = root;
        let archivePath = path_1.default.join(yield utils.createTempDirectory(), 'cache.tgz');
        const args = ['-cz'];
        const IS_WINDOWS = process.platform === 'win32';
        if (IS_WINDOWS) {
            args.push('--force-local');
            archivePath = archivePath.replace(/\\/g, '/');
            cachePath = cachePath.replace(/\\/g, '/');
        }
        args.push(...['-f', archivePath, '-C', cachePath, '.']);
        const tarPath = yield io.which("tar", true);
        yield cli.exec(`"${tarPath}"`, args);
        const fileSizeLimit = 200 * 1024 * 1024; // 200MB
        const archiveFileSize = fs_1.default.statSync(archivePath).size;
        if (archiveFileSize > fileSizeLimit) {
            core.warning(`Cache size of ${archiveFileSize} bytes is over the 200MB limit, not saving cache`);
            return root;
        }
        const stream = fs_1.default.createReadStream(archivePath);
        yield cacheHttpClient.saveCache(stream, key);
        return root;
    });
}
exports.toCache = toCache;
