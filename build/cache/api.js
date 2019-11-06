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
const io = __importStar(require("@actions/io"));
const toolCache = __importStar(require("@actions/tool-cache"));
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const tar_1 = __importDefault(require("tar"));
const utils = __importStar(require("./utils"));
/**
 * Fetch the cache entry, based on the key, from the cache API.
 * This allows us to fetch a cache entry from another workflow run.
 * It returns false when no cache was found, true when it's restored.
 */
function fetchEntry(key, target) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield node_fetch_1.default(utils.getUrl(`_apis/artifactcache/cache?keys=${encodeURIComponent(key)}`), {
            method: 'get',
            headers: {
                Accept: 'application/json;api-version=5.2-preview.1',
                Authorization: `Bearer ${utils.getToken()}`,
            },
        });
        if (response.status === 204) {
            return false;
        }
        if (response.status !== 200) {
            throw new Error(utils.errors.API_ERROR + response.status);
        }
        const data = yield response.json();
        if (!data || !data.archiveLocation) {
            throw new Error(utils.errors.API_ENTRY_NOT_FOUND + key);
        }
        const archiveDownload = yield toolCache.downloadTool(data.archiveLocation);
        const archivePath = utils.getTemporaryPath('cache.tgz');
        yield io.mv(archiveDownload, archivePath);
        yield io.mkdirP(target);
        yield toolCache.extractTar(archivePath, target);
        core.saveState(utils.states.CACHE_ENTRY, JSON.stringify(data));
        return true;
    });
}
exports.fetchEntry = fetchEntry;
/**
 * Store a directory in the cache API.
 * This allows us to fetch a cache entry from another workflow run.
 * It returns false when a previously restored cache was found, true when a new cache is stored.
 */
function storeEntry(key, target) {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheEntryRaw = core.getState(utils.states.CACHE_ENTRY);
        const cacheEntry = cacheEntryRaw ? JSON.parse(cacheEntryRaw) : null;
        if (cacheEntry) {
            return false;
        }
        const archivePath = utils.getTemporaryPath('cache.tgz');
        yield tar_1.default.create({ gzip: true, file: archivePath, cwd: target }, ['node_modules']);
        yield utils.validateArchive(archivePath);
        const response = yield node_fetch_1.default(utils.getUrl(`_apis/artifactcache/cache/${encodeURIComponent(key)}`), {
            body: fs_1.default.createReadStream(archivePath),
            method: 'post',
            headers: {
                Accept: 'application/json;api-version=5.2-preview.1',
                Authorization: `Bearer ${utils.getToken()}`,
                'Content-Type': 'application/octet-stream',
            },
        });
        if (response.status === 204) {
            throw new Error(utils.errors.API_ENTRY_NOT_FOUND + key);
        }
        if (response.status !== 200) {
            throw new Error(utils.errors.API_ERROR + response.status);
        }
        return true;
    });
}
exports.storeEntry = storeEntry;
