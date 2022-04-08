import type { ZodType } from 'zod';

export function getConfig<ValidResponseType>(
  schema: ZodType<ValidResponseType>
): ValidResponseType {
  return schema.parse(process.env);
}
