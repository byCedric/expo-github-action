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
Object.defineProperty(exports, "__esModule", { value: true });
const cli = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const cache_1 = require("./cache");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const registry = require('libnpm');
/**
 * Resolve the provided semver to exact version of `expo-cli`.
 * This uses the npm registry and accepts latest, dist-tags or version ranges.
 * It's used to determine the cached version of `expo-cli`.
 */
function resolve(version) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield registry.manifest(`expo-cli@${version}`)).version;
    });
}
exports.resolve = resolve;
/**
 * Install `expo-cli`, by version, using the packager.
 * Here you can provide any semver range or dist tag used in the registry.
 * It returns the path where Expo is installed.
 */
function install(version, packager) {
    return __awaiter(this, void 0, void 0, function* () {
        const exact = yield resolve(version);
        let root = yield cache_1.fromCache(exact, packager);
        if (!root) {
            const installPath = yield fromPackager(exact, packager);
            const cachePath = yield cache_1.toCache(exact, packager, installPath);
            root = cachePath || installPath;
        }
        return path.join(root, 'node_modules', '.bin');
    });
}
exports.install = install;
/**
 * Install `expo-cli`, by version, using npm or yarn.
 * It creates a temporary directory to store all required files.
 */
function fromPackager(version, packager) {
    return __awaiter(this, void 0, void 0, function* () {
        const root = process.env['RUNNER_TEMP'] || '';
        const tool = yield io.which(packager);
        yield io.mkdirP(root);
        yield cli.exec(tool, ['add', `expo-cli@${version}`], { cwd: root });
        return root;
    });
}
exports.fromPackager = fromPackager;
