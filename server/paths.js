import os from 'node:os'
import path from 'node:path'

// herdr sets these for plugin commands; the fallbacks cover running outside herdr.
export const stateDir = process.env.HERDR_PLUGIN_STATE_DIR || path.join(os.homedir(), '.local', 'state', 'herdr-watcher')
export const configDir = process.env.HERDR_PLUGIN_CONFIG_DIR || path.join(os.homedir(), '.config', 'herdr-watcher')
export const runtimeFile = path.join(stateDir, 'server.json')
