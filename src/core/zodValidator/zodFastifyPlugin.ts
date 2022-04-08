// Inlined from https://github.com/turkerdev/fastify-type-provider-zod
import fp from 'fastify-plugin';
import swagger from 'fastify-swagger';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { FastifySchemaCompiler } from 'fastify';
import type {
  FastifySchemaValidationError,
  FastifySerializerCompiler,
} from 'fastify/types/schema';
import type { ZodAny } from 'zod';

export type SchemaErrorFormatterFn = (
  errors: FastifySchemaValidationError[],
  dataVar: string
) => Error;

// TODO: This isn't being called and needs to be rewritten for `zod`.
//       There's potentially a bug in the alpha of `fastify` that needs
//       to be resolved for it to be used.
export const zodSchemaErrorFormatter: SchemaErrorFormatterFn = (
  errors,
  dataVar
) => {
  const separator = ', ';

  let text = '';
  for (var i = 0; i !== errors.length; ++i) {
    const e = errors[i];
    text += dataVar + (e?.instancePath || '') + ' ' + e?.message + separator;
  }

  return new Error(text.slice(0, -separator.length));
};

export const zodValidatorCompiler: FastifySchemaCompiler<ZodAny> =
  ({ schema }) =>
  (data) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      return {
        error: result.error,
      };
    }

    return {
      value: result.data,
    };
  };

export const zodSerializerCompiler: FastifySerializerCompiler<ZodAny> =
  ({ schema }) =>
  (data) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `Response doesn't match the schema: ${result.error.format()}`
      );
    }

    return JSON.stringify(result.data);
  };

export const fastifyZod = fp(async (app, options: any) => {
  // @ts-ignore
  await app.register(swagger, {
    exposeRoute: true,
    openapi: {
      info: {
        title: options['title'],
        description: options['description'],
      },
    },
    transform({ schema, url }) {
      const transformedUrl = url;
      const {
        params,
        body,
        querystring,
        headers,
        response,
        ...transformedSchema
      } = schema;

      if (params) {
        // @ts-ignore
        transformedSchema.params = zodToJsonSchema(params as any);
      }
      if (body) {
        // @ts-ignore
        transformedSchema.body = zodToJsonSchema(body as any);
      }
      if (querystring) {
        // @ts-ignore
        transformedSchema.querystring = zodToJsonSchema(querystring as any);
      }
      if (headers) {
        // @ts-ignore
        transformedSchema.headers = zodToJsonSchema(headers as any);
      }
      if (response) {
        // @ts-ignore
        transformedSchema.response = Object.fromEntries(
          Object.entries(response as any).map(
            ([statusCode, statusResponse]) => [
              statusCode,
              zodToJsonSchema(statusResponse as any),
            ]
          )
        );
      }

      return {
        url: transformedUrl,
        schema: transformedSchema,
      };
    },
  });
});
