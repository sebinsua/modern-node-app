// Inlined from https://github.com/turkerdev/fastify-type-provider-zod
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { FastifySchemaCompiler } from 'fastify';
import type {
  FastifySchemaValidationError,
  FastifySerializerCompiler,
} from 'fastify/types/schema';
import type { ZodType, ZodTypeDef, ZodAny } from 'zod';
import type { JsonSchema7Type } from 'zod-to-json-schema/src/parseDef';

export type SchemaErrorFormatterFn = (
  errors: FastifySchemaValidationError[],
  dataVar: string
) => Error;

function toOpenApi3(
  schema: ZodType<any, ZodTypeDef, any>
): { $schema: 'http://json-schema.org/draft-07/schema#' } & JsonSchema7Type {
  // @ts-ignore
  return zodToJsonSchema(schema, { target: 'openApi3' });
}

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
        transformedSchema.params = toOpenApi3(params);
      }
      if (body) {
        // @ts-ignore
        transformedSchema.body = toOpenApi3(body);
      }
      if (querystring) {
        // @ts-ignore
        transformedSchema.querystring = toOpenApi3(querystring);
      }
      if (headers) {
        // @ts-ignore
        transformedSchema.headers = toOpenApi3(headers);
      }
      if (response) {
        // @ts-ignore
        transformedSchema.response = Object.fromEntries(
          Object.entries(response as any).map(
            ([statusCode, statusResponse]) => [
              statusCode,
              // @ts-ignore
              toOpenApi3(statusResponse),
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
