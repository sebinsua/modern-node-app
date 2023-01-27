// Inlined from https://github.com/turkerdev/fastify-type-provider-zod
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type {
  FastifySchemaCompiler,
  FastifyError,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import type {
  FastifySchemaValidationError,
  FastifySerializerCompiler,
} from 'fastify/types/schema';
import type { ZodType, ZodTypeDef, ZodAny, ZodError } from 'zod';
import type { JsonSchema7Type } from 'zod-to-json-schema/src/parseDef';

function toOpenApi3(
  schema: ZodType<any, ZodTypeDef, any>
): { $schema: 'http://json-schema.org/draft-07/schema#' } & JsonSchema7Type {
  // @ts-ignore
  return zodToJsonSchema(schema, { target: 'openApi3' });
}

export type SchemaErrorFormatterFn = (
  errors: FastifySchemaValidationError[],
  dataVar: string
) => Error;

// TODO: This isn't being called and needs to be rewritten for `zod`.
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

function isZodError(
  error: Error
): error is ZodError & { validationContext: string } {
  return error.name === 'ZodError';
}

export type ErrorFormatterFn = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => any | Promise<any>;

export const zodErrorHandler: ErrorFormatterFn = (error, _request, reply) => {
  if (isZodError(error)) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      cause: {
        context: error.validationContext,
        issues: error.issues,
      },
    });
  }
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

  await app.register(swaggerUi);
});
