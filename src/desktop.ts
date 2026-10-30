import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

const JSON_FILTER = [{ name: 'bluxit wallet', extensions: ['json'] }]

export function isDesktop() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function getWalletPath(): Promise<string | null> {
  if (!isDesktop()) return null
  return invoke<string | null>('get_wallet_path')
}

export async function defaultWalletPath(): Promise<string> {
  return invoke<string>('default_wallet_path')
}

export async function setWalletPath(path: string): Promise<void> {
  await invoke('set_wallet_path', { path })
}

export async function moveWallet(nextPath: string): Promise<void> {
  await invoke('move_wallet', { nextPath })
}

export async function readWalletFile(): Promise<string | null> {
  return invoke<string | null>('read_wallet')
}

export async function writeWalletFile(contents: string): Promise<void> {
  await invoke('write_wallet', { contents })
}

export async function pickNewWalletFile(suggested?: string | null): Promise<string | null> {
  return save({
    defaultPath: suggested || 'bluxit.json',
    filters: JSON_FILTER,
    title: 'Choose where bluxit saves your wallet',
  })
}

export async function pickExistingWalletFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: JSON_FILTER,
    title: 'Open an existing bluxit wallet',
  })
  if (Array.isArray(selected)) return selected[0] ?? null
  return selected
}
