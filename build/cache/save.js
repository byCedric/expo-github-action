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
const utils_1 = require("./utils");
/**
 * Save the Expo CLI to local and remote cache, when enabled.
 * It always returns the local cache path, even when saved on remote cache.
 * When something went wrong, it returns nothing but the output will be set to failed.
 */
function toCache(context, dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const localCachePath = yield toolCache.cacheDir(dir, 'expo-cli', context.version, os_1.default.arch());
        core.info(`cache: saving for ${JSON.stringify(Object.assign(Object.assign({}, context), { dir }))}`);
        core.info(`cache: local path ${localCachePath}`);
        if (!context.remoteCache) {
            return;
        }
        const remoteCachekey = utils_1.getKey(context.version, context.packager);
        let remoteCacheResponse;
        core.info(`cache: remote key ${remoteCachekey}`);
        try {
            remoteCacheResponse = yield api_1.storeEntry(remoteCachekey, localCachePath);
        }
        catch (error) {
            core.setFailed(error.message);
        }
        if (remoteCacheResponse) {
            return localCachePath;
        }
        core.info('cache: skipping new cache');
    });
}
exports.toCache = toCache;
