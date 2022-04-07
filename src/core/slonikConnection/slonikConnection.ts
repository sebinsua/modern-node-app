import { getConnectionPool } from './slonikFastifyPlugin';

import type { DatabasePool, DatabasePoolConnection } from 'slonik';

export const withConnection: DatabasePool['connect'] = function withConnection(
  connectionRoutine
) {
  const connectionPool = getConnectionPool();

  return connectionPool.connect(connectionRoutine);
};

export const slonikConnection = new Proxy({} as DatabasePoolConnection, {
  get(_, prop) {
    switch (prop) {
      case 'any':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.any(
              // @ts-ignore
              ...args
            )
          );
      case 'anyFirst':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.anyFirst(
              // @ts-ignore
              ...args
            )
          );
      case 'exists':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.exists(
              // @ts-ignore
              ...args
            )
          );
      case 'many':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.many(
              // @ts-ignore
              ...args
            )
          );
      case 'manyFirst':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.manyFirst(
              // @ts-ignore
              ...args
            )
          );
      case 'maybeOne':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.maybeOne(
              // @ts-ignore
              ...args
            )
          );
      case 'maybeOneFirst':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.maybeOneFirst(
              // @ts-ignore
              ...args
            )
          );
      case 'one':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.one(
              // @ts-ignore
              ...args
            )
          );
      case 'oneFirst':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.oneFirst(
              // @ts-ignore
              ...args
            )
          );
      case 'query':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.query(
              // @ts-ignore
              ...args
            )
          );
      case 'copyFromBinary':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.copyFromBinary(
              // @ts-ignore
              ...args
            )
          );
      case 'stream':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.stream(
              // @ts-ignore
              ...args
            )
          );
      case 'transaction':
        return (...args: any[]) =>
          withConnection((connection) =>
            connection.transaction(
              // @ts-ignore
              ...args
            )
          );
      default:
        throw new Error(`Unexpected property: ${prop.toString()}`);
    }
  },
});
