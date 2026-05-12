import { Provider } from "./provider"

export const Support = ["supported", "unsupported", "partial", "unknown"] as const
export type Support = (typeof Support)[number]

export const Quirk = [
  "requires_tools_when_history_has_tool_calls",
  "provider_options_namespace_remap",
  "reasoning_summary_gating",
  "gateway_upstream_option_routing",
  "lower_case_tool_repair",
] as const
export type Quirk = (typeof Quirk)[number]

export type Entry = {
  providerID: string
  modelID: string
  api: Provider.Model["api"]
  status: Provider.Model["status"]
  declared: {
    toolcall: boolean
    input: Provider.Model["capabilities"]["input"]
    output: Provider.Model["capabilities"]["output"]
    reasoning: boolean
    interleaved: Provider.Model["capabilities"]["interleaved"]
    promptCacheCost: Provider.Model["cost"]["cache"]
    limit: Provider.Model["limit"]
    cost: Provider.Model["cost"]
  }
  support: {
    text: Support
    tools: Support
    imageInput: Support
    pdfInput: Support
    reasoning: Support
    cache: Support
    streaming: Support
  }
  quirks: Quirk[]
}

export type Options = {
  providerOptions?: Record<string, unknown>
}

function supports(value: boolean): Support {
  return value ? "supported" : "unsupported"
}

function supportsCache(model: Provider.Model): Support {
  if (model.cost.cache.read > 0 || model.cost.cache.write > 0) return "supported"
  if (model.providerID === "openai" || model.providerID === "anthropic" || model.providerID.includes("bedrock")) {
    return "partial"
  }
  return "unknown"
}

function isLiteLLMProxy(model: Provider.Model, options?: Options) {
  return (
    options?.providerOptions?.["litellmProxy"] === true ||
    model.providerID.toLowerCase().includes("litellm") ||
    model.api.id.toLowerCase().includes("litellm")
  )
}

function quirks(model: Provider.Model, options?: Options): Quirk[] {
  const result = new Set<Quirk>(["lower_case_tool_repair"])
  if (isLiteLLMProxy(model, options) || model.providerID.includes("github-copilot")) {
    result.add("requires_tools_when_history_has_tool_calls")
  }
  if (
    model.providerID === "openrouter" ||
    model.providerID === "llmgateway" ||
    model.api.npm === "@ai-sdk/openai-compatible" ||
    model.api.npm === "@openrouter/ai-sdk-provider" ||
    model.api.npm === "@llmgateway/ai-sdk-provider" ||
    model.api.npm === "ai-gateway-provider"
  ) {
    result.add("provider_options_namespace_remap")
  }
  if (model.capabilities.reasoning) result.add("reasoning_summary_gating")
  if (model.api.npm === "@ai-sdk/gateway") result.add("gateway_upstream_option_routing")
  return [...result]
}

export function fromModel(model: Provider.Model, options?: Options): Entry {
  return {
    providerID: model.providerID,
    modelID: model.id,
    api: model.api,
    status: model.status,
    declared: {
      toolcall: model.capabilities.toolcall,
      input: model.capabilities.input,
      output: model.capabilities.output,
      reasoning: model.capabilities.reasoning,
      interleaved: model.capabilities.interleaved,
      promptCacheCost: model.cost.cache,
      limit: model.limit,
      cost: model.cost,
    },
    support: {
      text: supports(model.capabilities.input.text && model.capabilities.output.text),
      tools: supports(model.capabilities.toolcall),
      imageInput: supports(model.capabilities.input.image),
      pdfInput: supports(model.capabilities.input.pdf),
      reasoning: model.capabilities.reasoning
        ? model.capabilities.interleaved
          ? "partial"
          : "supported"
        : "unsupported",
      cache: supportsCache(model),
      streaming: "supported",
    },
    quirks: quirks(model, options),
  }
}

export function matrix(providers: Record<string, Provider.Info>) {
  return Object.fromEntries(
    Object.entries(providers).map(([providerID, provider]) => [
      providerID,
      Object.fromEntries(Object.entries(provider.models).map(([modelID, model]) => [modelID, fromModel(model)])),
    ]),
  )
}

export function hasQuirk(model: Provider.Model, quirk: Quirk, options?: Options) {
  return fromModel(model, options).quirks.includes(quirk)
}

export function requiresToolParameterWhenHistoryHasToolCalls(model: Provider.Model, options?: Options) {
  return hasQuirk(model, "requires_tools_when_history_has_tool_calls", options)
}

export const ProviderCapability = {
  fromModel,
  matrix,
  hasQuirk,
  requiresToolParameterWhenHistoryHasToolCalls,
}
