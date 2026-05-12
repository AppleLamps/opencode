import { describe, expect, test } from "bun:test"
import type { APICallError } from "ai"
import { ProviderError } from "@/provider/error"
import { ProviderID } from "@/provider/schema"

function apiError(input: Partial<APICallError> & { message: string }): APICallError {
  return {
    name: "AI_APICallError",
    message: input.message,
    url: input.url,
    requestBodyValues: input.requestBodyValues,
    statusCode: input.statusCode,
    responseHeaders: input.responseHeaders,
    responseBody: input.responseBody,
    isRetryable: input.isRetryable ?? false,
    data: input.data,
    cause: input.cause,
  } as APICallError
}

describe("ProviderError.parseAPICallError", () => {
  test("classifies OpenRouter context length errors as overflow", () => {
    const result = ProviderError.parseAPICallError({
      providerID: ProviderID.openrouter,
      error: apiError({ message: "maximum context length is 128000 tokens", statusCode: 400 }),
    })

    expect(result.type).toBe("context_overflow")
  })

  test("classifies HTTP 413 as overflow", () => {
    const result = ProviderError.parseAPICallError({
      providerID: ProviderID.mistral,
      error: apiError({ message: "Payload Too Large", statusCode: 413 }),
    })

    expect(result.type).toBe("context_overflow")
  })

  test("keeps OpenAI 404 retryable for transient model availability", () => {
    const result = ProviderError.parseAPICallError({
      providerID: ProviderID.openai,
      error: apiError({ message: "Not Found", statusCode: 404 }),
    })

    expect(result.type).toBe("api_error")
    if (result.type === "api_error") expect(result.isRetryable).toBe(true)
  })
})
