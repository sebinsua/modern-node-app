import { fetch } from 'undici';
import { randomUUID } from 'crypto';
import { requestContext } from 'fastify-request-context';

import { dedupeError, logger } from './logger';

import type { RequestInit, Response } from 'undici';
import type { ZodType, ZodIssue } from 'zod';

interface HttpClientErrorConfig {
  response: Response;
  method: RequestInit['method'];
  requestBody?: Record<string, unknown>;
  responseBody?: unknown;
}

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
class HttpClientError extends Error {
  method?: string;
  url: string;
  requestBody?: HttpClientErrorConfig['requestBody'];
  status: number;
  responseBody?: unknown;

  constructor(
    message: string,
    { response, method, requestBody, responseBody }: HttpClientErrorConfig
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown. Only available on v8.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpClientError);
    }

    this.name = 'HttpClientError';
    this.method = method!;
    this.url = response.url;
    this.requestBody = requestBody!;
    this.status = response.status;
    this.responseBody = responseBody;
  }
}

export type FetchWithAuthOptions = RequestInit & {
  json?: Record<string, any>;
};

async function fetchWithAuth<TReturnValue = any>(
  endpoint: string,
  { json, ...customOptions }: FetchWithAuthOptions = {}
): Promise<TReturnValue> {
  const requestId = randomUUID();
  const correlationId = requestContext.get('correlationId');

  const options: RequestInit = {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    ...customOptions,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Request-Id': requestId,
      'Correlation-Id': correlationId,
      ...customOptions.headers,
    },
  };
  if (json) {
    // @ts-ignore
    options.body = JSON.stringify(json);
  }

  const response = await fetch(endpoint, options);

  const method = options.method;

  if (response.status === 401) {
    throw new HttpClientError(
      `Unauthenticated ${method} request to ${endpoint}`,
      {
        response,
        method,
        requestBody: json!,
      }
    );
  }

  if (!response.ok) {
    const errorMessage = `There was a ${response.status} error while making a ${method} request to ${endpoint}`;

    let jsonResponse;
    try {
      jsonResponse = await response.json();
    } catch (err) {
      // We silence this error because it's a legitimate possibility.
      //
      // For example, servers often respond with empty content or 'Internal Server Error' and in these situations
      // we need to continue to throw the original error about a bad status code.
      logger.debug(
        `When making a ${options.method} request to ${endpoint} the response could not be consumed as JSON. Original Error: ${err}`
      );
    }

    if (jsonResponse) {
      throw new HttpClientError(
        `${errorMessage}. The response was: ${JSON.stringify(jsonResponse)}`,
        {
          response,
          method,
          requestBody: json!,
          responseBody: jsonResponse,
        }
      );
    }

    let textResponse;
    try {
      textResponse = await response.text();
    } catch (err) {
      logger.debug(
        `When making a ${options.method} request to ${endpoint} the response could not be consumed as text. Original Error: ${err}`
      );
    }

    if (textResponse) {
      throw new HttpClientError(
        `${errorMessage}. The response was: ${textResponse}`,
        {
          response,
          method,
          requestBody: json!,
          responseBody: textResponse,
        }
      );
    }

    throw new HttpClientError(errorMessage, {
      response,
      method,
      requestBody: json!,
    });
  }

  return response.json() as Promise<TReturnValue>;
}

interface ApiResponseValidationErrorConfig {
  method: RequestInit['method'];
  endpoint: string;
  requestBody?: Record<string, unknown>;
  responseBody?: unknown;
  issues: ZodIssue[];
}

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
class ApiResponseValidationError extends Error {
  method?: string;
  endpoint: string;
  requestBody?: ApiResponseValidationErrorConfig['requestBody'];
  responseBody?: unknown;
  issues: ZodIssue[];

  constructor(
    message: string,
    {
      method,
      endpoint,
      requestBody,
      responseBody,
      issues,
    }: ApiResponseValidationErrorConfig
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown. Only available on v8.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiResponseValidationError);
    }

    this.name = 'ApiResponseValidationError';
    this.method = method!;
    this.endpoint = endpoint;
    this.requestBody = requestBody!;
    this.responseBody = responseBody;
    this.issues = issues;
  }
}

export type ApiFetchOptions<ValidResponseType> = FetchWithAuthOptions & {
  /**
   * @description We use this to validate the types of responses **at runtime**.
   */
  Validator: ZodType<ValidResponseType>;
};

/**
 * `fetchApi` calls `fetchWithAuth` and validates its response using [a **mandatory** `Validator`](https://github.com/colinhacks/zod).
 *
 * It produces runtime errors if there are mismatches between the responses produced by backend APIs and types.
 */
export async function fetchApi<
  /**
   * `ValidResponseType` is a placeholder type that tells TypeScript that the type that the `Validator` validates
   * should be used as the type of the return value. It is inferred from the `Validator` and should not be passed in.
   */
  ValidResponseType
>(
  endpoint: string,
  { Validator, ...options }: ApiFetchOptions<ValidResponseType>
): Promise<ValidResponseType> {
  const response = await fetchWithAuth(endpoint, options);

  // We validate the `response` by passing it into `Validator.safeParse()`.
  //
  // This will error on invalid values for types and missing properties.
  //
  // And, if the type passed in was marked as `.strict()` it will also
  // error when there are additional properties.
  //
  // See: https://github.com/colinhacks/zod#strict
  const validationResult = Validator.safeParse(response);

  // If there has been an error validating the response.
  if (!validationResult.success) {
    const method = options.method ?? 'GET';
    const baseErrorMessage = `An invalid response was given by ${method} ${endpoint}:`;

    dedupeError(baseErrorMessage, validationResult.error.format());

    // In development mode we cause a hard failure when an API is no longer
    // responding with the response we expected.
    //
    // This forces the developer working on the app to update it and fix
    // any problems that have resulted from this, which should decrease
    // the likelihood of the UI and backend getting out of sync.
    if (process.env['NODE_ENV'] === 'development') {
      const issues = validationResult.error.issues.map(
        (issue) =>
          `- ${issue.path.length > 0 ? issue.path.join('/') : '(root)'}: ${
            issue.message
          } (${issue.code})`
      );

      throw new ApiResponseValidationError(
        `${baseErrorMessage}\n\n${issues.join('\n')}\n`,
        {
          method,
          endpoint,
          requestBody: options.json!,
          responseBody: response,
          issues: validationResult.error.issues,
        }
      );
    }

    // In production mode we do not want to cause hard failures on invalid responses.
    // We return the response even if it is invalid.
    return response as ValidResponseType;
  }

  const validResponse = validationResult.data;

  return validResponse;
}
