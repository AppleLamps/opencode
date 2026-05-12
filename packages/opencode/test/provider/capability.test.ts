import { describe, expect, test } from "bun:test"
import { ProviderCapability } from "@/provider/capability"
import { Provider } from "@/provider/provider"
import { ModelID, ProviderID } from "@/provider/schema"

function model(input: {
  providerID: string
  id: string
  npm: string
  apiID?: string
  reasoning?: boolean
  toolcall?: boolean
  image?: boolean
  pdf?: boolean
  cacheRead?: number
  cacheWrite?: number
  interleaved?: Provider.Model["capabilities"]["interleaved"]
}): Provider.Model {
  return {
    id: ModelID.make(input.id),
    providerID: ProviderID.make(input.providerID),
    api: {
      id: input.apiID ?? input.id,
      url: "https://example.com/v1",
      npm: input.npm,
    },
    name: input.id,
    family: "",
    capabilities: {
      temperature: true,
      reasoning: input.reasoning ?? false,
      attachment: input.image ?? false,
      toolcall: input.toolcall ?? true,
      input: {
        text: true,
        audio: false,
        image: input.image ?? false,
        video: false,
        pdf: input.pdf ?? false,
      },
      output: {
        text: true,
        audio: false,
        image: false,
        video: false,
        pdf: false,
      },
      interleaved: input.interleaved ?? false,
    },
    cost: {
      input: 1,
      output: 2,
      cache: {
        read: input.cacheRead ?? 0,
        write: input.cacheWrite ?? 0,
      },
    },
    limit: {
      context: 128_000,
      output: 8_192,
    },
    status: "active",
    options: {},
    headers: {},
    release_date: "2026-01-01",
    variants: {},
  }
}

describe("ProviderCapability.fromModel", () => {
  test("derives OpenAI support from model capabilities and cost", () => {
    const entry = ProviderCapability.fromModel(
      model({
        providerID: "openai",
        id: "gpt-5.2",
        npm: "@ai-sdk/openai",
        reasoning: true,
        image: true,
        pdf: true,
        cacheRead: 0.125,
        cacheWrite: 1.25,
      }),
    )

    expect(entry.support).toMatchObject({
      text: "supported",
      tools: "supported",
      imageInput: "supported",
      pdfInput: "supported",
      reasoning: "supported",
      cache: "supported",
      streaming: "supported",
    })
    expect(entry.quirks).toContain("reasoning_summary_gating")
  })

  test("marks Anthropic cache as partial when cost data is absent", () => {
    const entry = ProviderCapability.fromModel(
      model({
        providerID: "anthropic",
        id: "claude-sonnet-4-5",
        npm: "@ai-sdk/anthropic",
        reasoning: true,
        image: true,
      }),
    )

    expect(entry.support.cache).toBe("partial")
    expect(entry.support.reasoning).toBe("supported")
  })

  test("marks Bedrock cache as partial and interleaved reasoning as partial", () => {
    const entry = ProviderCapability.fromModel(
      model({
        providerID: "amazon-bedrock",
        id: "anthropic.claude-sonnet-4-5",
        npm: "@ai-sdk/amazon-bedrock",
        reasoning: true,
        interleaved: { field: "reasoning_content" },
      }),
    )

    expect(entry.support.cache).toBe("partial")
    expect(entry.support.reasoning).toBe("partial")
  })

  test("records OpenRouter namespace and reasoning quirks", () => {
    const entry = ProviderCapability.fromModel(
      model({
        providerID: "openrouter",
        id: "openai/gpt-5.2",
        npm: "@openrouter/ai-sdk-provider",
        reasoning: true,
      }),
    )

    expect(entry.quirks).toContain("provider_options_namespace_remap")
    expect(entry.quirks).toContain("reasoning_summary_gating")
  })

  test("records LiteLLM-style tool-history requirement by provider id, api id, and option", () => {
    expect(
      ProviderCapability.requiresToolParameterWhenHistoryHasToolCalls(
        model({ providerID: "litellm", id: "gpt-5.2", npm: "@ai-sdk/openai-compatible" }),
      ),
    ).toBe(true)
    expect(
      ProviderCapability.requiresToolParameterWhenHistoryHasToolCalls(
        model({
          providerID: "custom",
          id: "gpt-5.2",
          apiID: "litellm/gpt-5.2",
          npm: "@ai-sdk/openai-compatible",
        }),
      ),
    ).toBe(true)
    expect(
      ProviderCapability.requiresToolParameterWhenHistoryHasToolCalls(
        model({ providerID: "custom", id: "gpt-5.2", npm: "@ai-sdk/openai-compatible" }),
        { providerOptions: { litellmProxy: true } },
      ),
    ).toBe(true)
  })

  test("records GitHub Copilot, Google, and local-compatible behavior", () => {
    expect(
      ProviderCapability.fromModel(
        model({ providerID: "github-copilot", id: "gpt-5.2", npm: "@ai-sdk/openai-compatible" }),
      ).quirks,
    ).toContain("requires_tools_when_history_has_tool_calls")
    expect(
      ProviderCapability.fromModel(model({ providerID: "google", id: "gemini-3-pro", npm: "@ai-sdk/google" })).support
        .imageInput,
    ).toBe("unsupported")
    expect(
      ProviderCapability.fromModel(
        model({ providerID: "ollama", id: "qwen3", npm: "@ai-sdk/openai-compatible", reasoning: true }),
      ).quirks,
    ).toContain("provider_options_namespace_remap")
  })
})
