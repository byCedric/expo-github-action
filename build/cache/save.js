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
const os_1 = __importDefault(require("os"));
const api_1 = require("./api");
function toCache(version, packager, dir) {
    return __awaiter(this, void 0, void 0, function* () {
        core.info(`Debug: saving cache for: ${JSON.stringify({ version, packager, dir })}`);
        const key = api_1.getKey(version, packager);
        core.info(`Debug: cache key: ${key}`);
        const localCachePath = yield toolCache.cacheDir(dir, 'expo-cli', version, os_1.default.arch());
        core.info(`Debug: local cache path: ${localCachePath}`);
        let remoteCacheResponse;
        try {
            remoteCacheResponse = yield api_1.storeEntry(key, localCachePath);
            core.info(`Debug: remote cache response: ${JSON.stringify(remoteCacheResponse)}`);
        }
        catch (error) {
            core.setFailed(error.message);
            core.info(`Debug: remote cache failed: ${error.message}`);
        }
        if (remoteCacheResponse !== null) {
            core.info(`Debug: remote cache saved from local cache path: ${localCachePath}`);
            return localCachePath;
        }
        core.info(`Debug: remote cache response empty`);
    });
}
exports.toCache = toCache;
