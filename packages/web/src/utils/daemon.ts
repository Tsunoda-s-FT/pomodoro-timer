/**
 * デーモンURLを取得
 * - ?local=true でローカルモード（undefined を返す）
 * - ?daemon=URL でカスタムURL
 * - それ以外はローカルモード
 */
export function getDaemonUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);

  // ?local=true の場合はローカルモード
  if (params.get('local') === 'true') {
    return undefined;
  }

  // ?daemon=URL で指定がある場合はそのURL
  const daemon = params.get('daemon');
  if (daemon) return daemon;

  return undefined;
}

/**
 * デーモンモードかどうか
 */
export function isDaemonMode(): boolean {
  return getDaemonUrl() !== undefined;
}
