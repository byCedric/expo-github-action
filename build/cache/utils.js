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
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
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
    return `T3-${process.platform}-${os_1.default.arch()}-node-${node}-${packager}-expo-cli-${version}`;
}
exports.getKey = getKey;
/**
 * Get the cache API URL from environment.
 * It tries the `ACTIONS_CACHE_URL` or `ACTIONS_RUNTIME_URL` env var as fallback.
 */
function getUrl(urlPath = '') {
    const urlHost = (process.env['ACTIONS_CACHE_URL'] ||
        process.env['ACTIONS_RUNTIME_URL'] ||
        '').replace('pipelines', 'artifactcache');
    if (urlHost) {
        return urlHost + urlPath;
    }
    throw new Error(exports.errors.URL_NOT_FOUND);
}
exports.getUrl = getUrl;
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
exports.getToken = getToken;
/**
 * Get the path to a temporary directory to safely write files to.
 * You can add a filename that's added to the temporary path.
 */
function getTemporaryPath(file = '') {
    return path_1.default.join(fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'expo-cli-')), file);
}
exports.getTemporaryPath = getTemporaryPath;
/**
 * Validate the archive file to check if we can upload it.
 * The current limitation is 400mb max size.
 */
function validateArchive(archive) {
    const MAX_SIZE = 400 * 1024 * 1024; // 400mb
    const archiveSize = fs_1.default.statSync(archive).size;
    core.info(`Cache: remote cache archive size is ${archiveSize}`);
    if (archiveSize > MAX_SIZE) {
        throw new Error(exports.errors.ARCHIVE_TOO_BIG + archiveSize);
    }
}
exports.validateArchive = validateArchive;
/**
 * Download an archive using the absolute URL.
 * It returns a temporary path to the archive file.
 */
function downloadArchive(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const path = getTemporaryPath('cache.tgz');
        const response = yield node_fetch_1.default(url);
        yield new Promise((resolve, reject) => {
            const stream = fs_1.default.createWriteStream(path);
            response.body.pipe(stream);
            response.body.on('error', reject);
            stream.on('finish', resolve);
        });
        return path;
    });
}
exports.downloadArchive = downloadArchive;
