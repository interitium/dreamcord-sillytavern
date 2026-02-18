# SillyTavern Server Plugin Mode

This folder can be installed directly as a SillyTavern server plugin.

## Install from local

1. Copy folder into your SillyTavern plugins directory:

`<SillyTavern>/plugins/dreamcord-sillytavern-bridge`

2. Ensure `enableServerPlugins: true` in `config.yaml`.
3. Restart SillyTavern.

Plugin routes become available under:

- `/api/plugins/dreamcord-sillytavern-bridge/health`
- `/api/plugins/dreamcord-sillytavern-bridge/config`
- `/api/plugins/dreamcord-sillytavern-bridge/mappings`
- `/api/plugins/dreamcord-sillytavern-bridge/sync/characters`

## Install from GitHub

- Put this plugin folder in a Git repo and clone it into SillyTavern `plugins/` as above.

## Required env vars (SillyTavern process)

- `DREAMCORD_BASE_URL`
- `DREAMCORD_ADMIN_USERNAME`
- `DREAMCORD_ADMIN_PASSWORD`
- `SILLYTAVERN_BASE_URL`
- `SILLYTAVERN_API_KEY`

Optional:

- `DREAMCORD_ADMIN_2FA`
- `DREAMCORD_BOT_TOKEN`
- `DEFAULT_TARGET_CHANNEL_ID`
- `DEFAULT_SOURCE_TAG`
- `SILLYTAVERN_CHARACTERS_URL`