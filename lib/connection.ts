/**
 * Is this connection good enough to spend a megabyte of video on?
 *
 * The honest answer is that the web cannot reliably tell you whether someone
 * is on Wi-Fi. `NetworkInformation.type` reports it directly but only exists
 * in Chromium on Android; Safari and Firefox expose nothing at all. So this is
 * a best-effort ladder rather than a true Wi-Fi test, and it is deliberately
 * ordered so the strongest evidence wins:
 *
 *   1. Save-Data is an explicit request not to spend the visitor's money.
 *      Nothing overrides it.
 *   2. `type` is a direct answer where it exists: wifi and ethernet get video,
 *      cellular does not.
 *   3. `effectiveType` is the widely supported fallback and measures observed
 *      speed rather than radio. 4g is fast enough; 3g and below are not.
 *   4. No API at all means a browser that has never shipped one, which in
 *      practice means desktop Safari and Firefox. Assume a good connection
 *      rather than punishing every one of them with a still.
 *
 * Getting this wrong in the cautious direction costs a visitor some motion.
 * Getting it wrong the other way costs them their data allowance, which for
 * this site's audience is the more expensive mistake.
 */

interface NetworkInformation extends EventTarget {
  saveData?: boolean;
  type?: string;
  effectiveType?: string;
}

export function getConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
}

export function connectionAllowsVideo(): boolean {
  const connection = getConnection();
  if (!connection) return true;

  if (connection.saveData === true) return false;

  if (connection.type) {
    return connection.type === "wifi" || connection.type === "ethernet";
  }

  return connection.effectiveType === "4g";
}

/**
 * Calls back whenever the connection changes, so a visitor who walks off Wi-Fi
 * mid-page stops paying for clips they did not ask for.
 */
export function watchConnection(onChange: () => void): () => void {
  const connection = getConnection();
  if (!connection) return () => {};
  connection.addEventListener("change", onChange);
  return () => connection.removeEventListener("change", onChange);
}
