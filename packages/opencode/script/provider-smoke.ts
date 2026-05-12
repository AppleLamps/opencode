import { Effect } from "effect"
import { Log } from "@opencode-ai/core/util/log"
import { jsonSchema, streamText, tool } from "ai"
import type { LanguageModelV3 } from "@ai-sdk/provider"
import { AppRuntime } from "../src/effect/app-runtime"
import { WithInstance } from "../src/project/with-instance"
import { ProviderCapability, type Support } from "../src/provider/capability"
import { Provider } from "../src/provider/provider"
import { ModelID, ProviderID } from "../src/provider/schema"
import { ProviderTransform } from "../src/provider/transform"

const Features = ["text", "tools", "image", "reasoning", "cache"] as const
export type Feature = (typeof Features)[number]

export type Args = {
  provider?: string
  model?: string
  allConfigured: boolean
  features: Feature[]
  json: boolean
}

export type SmokeTarget = {
  providerID: string
  modelID: string
  configured: boolean
  capability: ReturnType<typeof ProviderCapability.fromModel>
}

export type SmokeResult = {
  providerID: string
  modelID: string
  feature: Feature
  status: "pass" | "fail" | "skip"
  latencyMs: number
  tokens?: {
    input?: number
    output?: number
    total?: number
  }
  error?: string
  reason?: string
}

export function parseArgs(argv: string[]): Args {
  const result: Args = { allConfigured: false, features: ["text", "tools"], json: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--provider") {
      result.provider = argv[++i]
      continue
    }
    if (arg === "--model") {
      result.model = argv[++i]
      continue
    }
    if (arg === "--all-configured") {
      result.allConfigured = true
      continue
    }
    if (arg === "--feature") {
      result.features = (argv[++i] ?? "")
        .split(",")
        .filter((item): item is Feature => Features.includes(item as Feature))
      continue
    }
    if (arg === "--json") {
      result.json = true
      continue
    }
  }
  if (!result.provider && !result.model) result.allConfigured = true
  if (result.features.length === 0) result.features = ["text", "tools"]
  return result
}

export function selectTargets(providers: Record<string, Provider.Info>, args: Args): SmokeTarget[] {
  return Object.entries(providers).flatMap(([providerID, provider]) => {
    if (args.provider && providerID !== args.provider) return []
    return Object.entries(provider.models)
      .filter(([modelID]) => !args.model || modelID === args.model)
      .map(([modelID, model]) => ({
        providerID,
        modelID,
        configured: Boolean(provider.key || provider.source === "config" || provider.source === "custom"),
        capability: ProviderCapability.fromModel(model, { providerOptions: provider.options }),
      }))
  })
}

function support(capability: ReturnType<typeof ProviderCapability.fromModel>, feature: Feature): Support {
  if (feature === "text") return capability.support.text
  if (feature === "tools") return capability.support.tools
  if (feature === "image") return capability.support.imageInput
  if (feature === "reasoning") return capability.support.reasoning
  return capability.support.cache
}

async function timed<T>(fn: () => Promise<T>) {
  const start = Date.now()
  try {
    return { latencyMs: Date.now() - start, value: await fn() }
  } catch (e) {
    return { latencyMs: Date.now() - start, error: e instanceof Error ? e.message : String(e) }
  }
}

async function textProbe(language: LanguageModelV3, model: Provider.Model, feature: Feature) {
  const options =
    feature === "reasoning" || feature === "cache"
      ? ProviderTransform.options({ model, sessionID: "provider-smoke", providerOptions: {} })
      : {}
  return timed(async () => {
    const result = streamText({
      model: language,
      prompt: "Reply with exactly OK.",
      maxOutputTokens: Math.min(ProviderTransform.maxOutputTokens(model), 16),
      providerOptions: ProviderTransform.providerOptions(model, options),
    })
    await result.consumeStream()
    return result.usage
  })
}

async function toolProbe(language: LanguageModelV3, model: Provider.Model) {
  return timed(async () => {
    const result = streamText({
      model: language,
      prompt: "Call the probe tool with value 2.",
      maxOutputTokens: Math.min(ProviderTransform.maxOutputTokens(model), 32),
      tools: {
        probe: tool({
          description: "Provider smoke test probe tool.",
          inputSchema: jsonSchema({
            type: "object",
            properties: { value: { type: "number" } },
            required: ["value"],
          }),
          execute: async () => "ok",
        }),
      },
      toolChoice: "required",
    })
    await result.consumeStream()
    return result.usage
  })
}

async function runFeature(target: SmokeTarget, feature: Feature): Promise<SmokeResult> {
  if (support(target.capability, feature) === "unsupported") {
    return {
      providerID: target.providerID,
      modelID: target.modelID,
      feature,
      status: "skip",
      latencyMs: 0,
      reason: "unsupported",
    }
  }
  const { language, model } = await resolveTarget(target)
  const result = feature === "tools" ? await toolProbe(language, model) : await textProbe(language, model, feature)
  if ("error" in result) {
    return {
      providerID: target.providerID,
      modelID: target.modelID,
      feature,
      status: "fail",
      latencyMs: result.latencyMs,
      error: result.error,
    }
  }
  const usage = await result.value
  return {
    providerID: target.providerID,
    modelID: target.modelID,
    feature,
    status: "pass",
    latencyMs: result.latencyMs,
    tokens: {
      input: usage.inputTokens,
      output: usage.outputTokens,
      total: usage.totalTokens,
    },
  }
}

function resolveTarget(target: SmokeTarget) {
  return AppRuntime.runPromise(
    Effect.gen(function* () {
      const provider = yield* Provider.Service
      const model = yield* provider.getModel(ProviderID.make(target.providerID), ModelID.make(target.modelID))
      const language = yield* provider.getLanguage(model)
      return { language, model }
    }),
  )
}

export async function run(argv: string[]) {
  return WithInstance.provide({
    directory: process.cwd(),
    fn: async () => {
      const args = parseArgs(argv)
      const providers = await AppRuntime.runPromise(
        Effect.gen(function* () {
          const provider = yield* Provider.Service
          return yield* provider.list()
        }),
      )
      const targets = selectTargets(providers, args)
      const results: SmokeResult[] = []

      for (const target of targets) {
        if (!target.configured) {
          for (const feature of args.features) {
            results.push({
              providerID: target.providerID,
              modelID: target.modelID,
              feature,
              status: "skip",
              latencyMs: 0,
              reason: "provider is not configured",
            })
          }
          continue
        }
        for (const feature of args.features) {
          results.push(await runFeature(target, feature))
        }
      }

      if (args.json) {
        console.log(JSON.stringify(results, null, 2))
      } else {
        for (const result of results) {
          const suffix = result.error ? ` ${result.error}` : result.reason ? ` ${result.reason}` : ""
          console.log(
            `${result.status.toUpperCase()} ${result.providerID}/${result.modelID} ${result.feature} ${result.latencyMs}ms${suffix}`,
          )
        }
      }

      if (results.some((result) => result.status === "fail")) process.exitCode = 1
      return results
    },
  })
}

if (import.meta.main) {
  await Log.init({ print: false, dev: true, level: "ERROR" })
  try {
    await run(Bun.argv.slice(2))
  } finally {
    await AppRuntime.dispose()
  }
}
