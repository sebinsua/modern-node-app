import fastJson from 'fast-json-stringify';
import safeStringify from 'fast-safe-stringify';

import type { MessageSerializer } from 'roarr';

const fastStringify = fastJson({
  properties: {
    level: {
      type: 'string',
    },
    message: {
      type: 'string',
    },
    sequence: {
      type: 'string',
    },
    time: {
      type: 'number',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
  },
  type: 'object',
});

export const serializeMessage: MessageSerializer = (message) => {
  return (
    '{"context":' +
    safeStringify(message.context) +
    ',' +
    fastStringify(message).slice(1)
  );
};
