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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const toolCache = __importStar(require("@actions/tool-cache"));
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const tar_1 = __importDefault(require("tar"));
/**
 * A list of error messages used when throwing errors.
 */
exports.errors = {
    URL_NOT_FOUND: 'Cache: URL not found, unable to interact with the cache API',
    TOKEN_NOT_FOUND: 'Cache: token not found, unable to authenticate with the cache API',
    ARCHIVE_TOO_BIG: 'Cache: archive is bigger than 200mb, unable to save it: ',
    API_ENTRY_NOT_FOUND: 'Cache: entry not found, unable to restore for key(s): ',
    API_ERROR: 'Cache: API responded with error status: ',
};
/**
 * A list of states used within the API checks.
 */
exports.states = {
    CACHE_ENTRY: 'cache-entry',
};
/**
 * Get the cache key based on verion and packager.
 * It also adds the node major version and arch/platform data.
 */
function getKey(version, packager) {
    const node = process.version.split('.')[0];
    return `${process.platform}-${os_1.default.arch()}-node-${node}-${packager}-expo-cli-${version}`;
}
exports.getKey = getKey;
/**
 * Get the cache API URL from environment.
 * It tries the `ACTIONS_CACHE_URL` or `ACTIONS_RUNTIME_URL` env var as fallback.
 */
function getUrl(path = '') {
    const url = (process.env['ACTIONS_CACHE_URL'] ||
        process.env['ACTIONS_RUNTIME_URL'] ||
        '').replace('pipelines', 'artifactcache');
    if (url) {
        return url + path;
    }
    throw new Error(exports.errors.URL_NOT_FOUND);
}
/**
 * Get the bearer token from environment.
 * It tries the `ACTIONS_RUNTIME_TOKEN` env var.
 */
function getToken() {
    const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';
    if (token) {
        return token;
    }
    throw new Error(exports.errors.TOKEN_NOT_FOUND);
}
/**
 * Get the path to a temporary directory to safely write files to.
 */
function getTemporaryPath() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'expo-cli'));
}
/**
 * Validate the archive file to check if we can upload it.
 * The current limitation is 200mb max size.
 */
function validateArchive(archive) {
    const MAX_SIZE = 200 * 1024 * 1024; // 200mb
    const archiveSize = fs_1.default.statSync(archive).size;
    if (archiveSize > MAX_SIZE) {
        throw new Error(exports.errors.ARCHIVE_TOO_BIG + archiveSize);
    }
}
/**
 * Fetch the cache entry, based on the key, from the cache API.
 * This allows us to fetch a cache entry from another workflow run.
 */
function fetchEntry(key, target) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield node_fetch_1.default(getUrl(`_apis/artifactcache/cache?keys=${encodeURIComponent(key)}`), {
            method: 'get',
            headers: {
                Accept: 'application/json;api-version=5.2-preview.1',
                Authorization: `Bearer ${getToken()}`,
            },
        });
        if (response.status === 204) {
            return null;
        }
        if (response.status !== 200) {
            throw new Error(exports.errors.API_ERROR + response.status);
        }
        const data = yield response.json();
        if (!data || !data.archiveLocation) {
            throw new Error(exports.errors.API_ENTRY_NOT_FOUND + key);
        }
        const archiveFile = yield toolCache.downloadTool(data.archiveLocation);
        yield toolCache.extractTar(archiveFile, target);
        core.saveState(exports.states.CACHE_ENTRY, JSON.stringify(data));
        return data;
    });
}
exports.fetchEntry = fetchEntry;
/**
 * Store a directory or file in the cache API.
 * This allows us to fetch a cache entry from another workflow run.
 */
function storeEntry(key, target) {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheEntryRaw = core.getState(exports.states.CACHE_ENTRY);
        const cacheEntry = cacheEntryRaw ? JSON.parse(cacheEntryRaw) : null;
        if (cacheEntry) {
            return cacheEntry;
        }
        const archivePath = path_1.default.join(getTemporaryPath(), 'cache.tgz');
        yield tar_1.default.create({ gzip: true, file: archivePath }, [target]);
        yield validateArchive(archivePath);
        const response = yield node_fetch_1.default(getUrl(`_apis/artifactcache/cache/${encodeURIComponent(key)}`), {
            body: fs_1.default.createReadStream(archivePath),
            method: 'post',
            headers: {
                Accept: 'application/json;api-version=5.2-preview.1',
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/octet-stream',
            },
        });
        if (response.status === 204) {
            throw new Error(exports.errors.API_ENTRY_NOT_FOUND + key);
        }
        if (response.status !== 200) {
            throw new Error(exports.errors.API_ERROR + response.status);
        }
        const data = yield response.json();
        if (!data || !data.archiveLocation) {
            throw new Error(exports.errors.API_ENTRY_NOT_FOUND + key);
        }
        return data;
    });
}
exports.storeEntry = storeEntry;
