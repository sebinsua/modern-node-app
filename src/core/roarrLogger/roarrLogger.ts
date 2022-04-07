import { Roarr, getLogLevelName } from 'roarr';
import { serializeError } from 'serialize-error';

import { serializeMessage } from './roarrSerializeMessage';

// @ts-ignore
const ROARR = (globalThis.ROARR = globalThis.ROARR || {});
ROARR.serializeMessage = serializeMessage;

export const serverLog = Roarr.child((message) => ({
  level: getLogLevelName(Number(message.context['logLevel'])).toUpperCase(),
  timestamp: new Date(message.time).toISOString(),
  ...message,
  context: {
    ...message.context,
    application: 'server',
  },
}));

export const logger = serverLog.child({});

const MAX_SIZE_SET = 1_000;

/**
 * This function dedupes error messages so that we only print to the
 * console once even if we log the same problem multiple times
 * (e.g. when multiple requests are made and all of the response are
 * invalid in the same way). This DX improvement is borrowed from React.
 *
 * See: https://github.com/facebook/react/blob/0e100ed00fb52cfd107db1d1081ef18fe4b9167f/packages/react-reconciler/src/ReactStrictModeWarnings.new.js#L60-L70
 */
const hasLogged = new Set<string>();
export function dedupeError(message: Error | string, extra?: unknown): void {
  const key = JSON.stringify([
    typeof message === 'string' ? message : serializeError(message),
    extra instanceof Error ? serializeError(extra) : extra,
  ]);

  if (hasLogged.has(key)) {
    return;
  }
  hasLogged.add(key);
  if (hasLogged.size > MAX_SIZE_SET) {
    hasLogged.clear();
  }

  if (extra !== undefined) {
    logger.error(
      extra instanceof Error ? serializeError(extra) : (extra as any),
      typeof message === 'string' ? message : message.message
    );
  } else {
    logger.error(typeof message === 'string' ? message : message.message);
  }
}
