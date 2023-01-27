import { z } from 'zod';

export const AppConfig = z.object({
  APP_HOST: z.string(),
  APP_PORT: z.coerce.number(),
  APP_BASE_URL: z.string().optional(),
  APP_POSTGRES_CONNECTION_STRING: z.string().url(),
  APP_POSTGRES_QUERY_LOGGING: z.coerce.boolean().default(false),
  APP_CORS_CREDENTIALS: z.coerce.boolean().default(true),
  APP_CORS_ORIGIN: z.string().optional(),
});
