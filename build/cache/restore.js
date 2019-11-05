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
const path_1 = __importDefault(require("path"));
const api_1 = require("./api");
function fromCache(version, packager) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = api_1.getKey(version, packager);
        const localCachePath = toolCache.find('expo-cli', version);
        if (localCachePath) {
            return localCachePath;
        }
        const remoteCachePath = path_1.default.join(process.env['RUNNER_TOOL_CACHE'] || '', 'expo-cli', '3.4.1', os_1.default.arch());
        let remoteCacheResponse;
        try {
            remoteCacheResponse = yield api_1.fetchEntry(key, remoteCachePath);
        }
        catch (error) {
            core.setFailed(error.message);
        }
        if (remoteCacheResponse !== null) {
            return remoteCachePath;
        }
    });
}
exports.fromCache = fromCache;
