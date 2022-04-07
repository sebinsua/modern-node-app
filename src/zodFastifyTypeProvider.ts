// Inlined from https://github.com/turkerdev/fastify-type-provider-zod
import type { FastifySchemaCompiler, FastifyTypeProvider } from "fastify";
import type { FastifySerializerCompiler } from "fastify/types/schema";
import type { z, ZodAny, ZodTypeAny } from "zod";

export interface ZodTypeProvider extends FastifyTypeProvider {
  output: this["input"] extends ZodTypeAny ? z.infer<this["input"]> : never;
}

export const validatorCompiler: FastifySchemaCompiler<ZodAny> =
  ({ schema }) =>
  (data): any => {
    try {
      return { value: schema.parse(data) };
    } catch (error) {
      return { error };
    }
  };

export const serializerCompiler: FastifySerializerCompiler<ZodAny> =
  ({ schema }) =>
  (data) => {
    const result = schema.safeParse(data);
    if (result.success) {
      return JSON.stringify(result.data);
    }
    throw Error("Response doesn't match the schema");
  };
