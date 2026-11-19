/**
 * The one place the desktop artifact prefix is spelled.
 *
 * It used to be repeated in the electron-builder config, the DMG report line,
 * and the upload plan; changing one left the others pointing at files that do
 * not exist. Import this instead of writing the prefix out.
 */
export const ARTIFACT_PREFIX = 'xiaoxiao-harness'
