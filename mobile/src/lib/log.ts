/**
 * Logging that stops at the release boundary.
 *
 * The app had 16 `console.warn` calls on its failure paths — auth errors,
 * failed syncs, ad-load failures — and every one of them shipped. On Android a
 * release build does not strip `console.*`: the calls execute, format their
 * arguments, and write to logcat, where any other app holding READ_LOGS on an
 * older device, and anyone with adb on a developer-mode phone, can read them.
 *
 * Two problems with that:
 *
 *   • **Privacy.** These lines carry Supabase error objects and auth failures.
 *     Nothing here is a credential, but error payloads are not something to
 *     broadcast to the system log by default, and the set of things being
 *     logged is only going to grow.
 *   • **Cost.** Argument formatting happens whether or not anyone is reading,
 *     on the JS thread, on the failure paths that fire most when the network
 *     is bad — which is exactly when a cheap phone is already struggling.
 *
 * So these are no-ops in release and unchanged in development.
 *
 * What that does and does not buy, checked against an actual release bundle
 * rather than assumed:
 *
 *   • The bodies ARE eliminated — `__DEV__` is a compile-time constant, and
 *     both functions minify to `function p(){}`. Nothing is written to logcat.
 *   • The call sites are NOT. `warn('hydrateProgress failed:', e)` survives as
 *     a call into an empty function, and its string literal stays in the
 *     bundle. Removing those would mean wrapping all 16 call sites in
 *     `if (__DEV__)`, and an empty call on a failure path is not worth that.
 *
 * So: the privacy problem is fixed, the formatting cost is gone, and a few
 * hundred bytes of dead strings remain. Do not describe this as full
 * dead-code elimination — it isn't.
 *
 * If real production diagnostics are ever needed, this is the one place to
 * route them to a crash reporter — not 16 call sites.
 */

export function warn(...args: unknown[]): void {
  if (__DEV__) {
    console.warn(...args);
  }
}

export function error(...args: unknown[]): void {
  if (__DEV__) {
    console.error(...args);
  }
}
