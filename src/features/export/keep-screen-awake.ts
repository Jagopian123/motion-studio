export function keepScreenAwake() {
  if (!navigator.wakeLock?.request) return () => {};
  let active = true;
  let requesting = false;
  let lock: WakeLockSentinel | undefined;
  const acquire = async () => {
    if (!active || document.hidden || requesting || (lock && !lock.released)) return;
    requesting = true;
    try {
      const next = await navigator.wakeLock.request('screen');
      if (active) lock = next;
      else await next.release();
    } catch {
      // The browser can decline based on visibility, power or permissions.
    } finally {
      requesting = false;
    }
  };
  document.addEventListener('visibilitychange', acquire);
  void acquire();
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', acquire);
    void lock?.release().catch(() => {});
  };
}
