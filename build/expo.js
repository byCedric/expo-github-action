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
const core = __importStar(require("@actions/core"));
const cli = __importStar(require("@actions/exec"));
/**
 * Authenticate at Expo using `expo login`.
 * This step is required for publishing and building new apps.
 * It uses the `EXPO_CLI_PASSWORD` environment variable for improved security.
 */
function authenticate(auth = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!auth.username || !auth.password) {
            return core.debug('Skipping authentication, `expo-username` and/or `expo-password` not set...');
        }
        // github actions toolkit will handle commands with `.cmd` on windows, we need that
        const bin = process.platform === 'win32'
            ? 'expo.cmd'
            : 'expo';
        yield cli.exec(bin, ['login', `--username=${auth.username}`], {
            env: Object.assign(Object.assign({}, process.env), { EXPO_CLI_PASSWORD: auth.password }),
        });
    });
}
exports.authenticate = authenticate;
