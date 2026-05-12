import { describe, expect, test } from "bun:test"
import { parseArgs, selectTargets } from "../../script/provider-smoke"
import { Provider } from "@/provider/provider"
import { ModelID, ProviderID } from "@/provider/schema"

function provider(): Provider.Info {
  return {
    id: ProviderID.make("fake"),
    name: "Fake",
    source: "config",
    env: ["FAKE_API_KEY"],
    key: "test",
    options: {},
    models: {
      "fake-model": {
        id: ModelID.make("fake-model"),
        providerID: ProviderID.make("fake"),
        api: { id: "fake-model", url: "https://example.com/v1", npm: "@ai-sdk/openai-compatible" },
        name: "Fake Model",
        family: "",
        capabilities: {
          temperature: true,
          reasoning: false,
          attachment: false,
          toolcall: true,
          input: { text: true, audio: false, image: false, video: false, pdf: false },
          output: { text: true, audio: false, image: false, video: false, pdf: false },
          interleaved: false,
        },
        cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
        limit: { context: 128_000, output: 8_192 },
        status: "active",
        options: {},
        headers: {},
        release_date: "2026-01-01",
        variants: {},
      },
    },
  }
}

describe("provider-smoke script helpers", () => {
  test("parses provider, model, feature, and json flags", () => {
    expect(
      parseArgs(["--provider", "fake", "--model", "fake-model", "--feature", "text,tools,image", "--json"]),
    ).toEqual({
      provider: "fake",
      model: "fake-model",
      allConfigured: false,
      features: ["text", "tools", "image"],
      json: true,
    })
  })

  test("defaults to all configured targets with text and tools", () => {
    expect(parseArgs([])).toMatchObject({
      allConfigured: true,
      features: ["text", "tools"],
    })
  })

  test("selects targets and attaches derived capabilities", () => {
    const targets = selectTargets({ fake: provider() }, parseArgs(["--provider", "fake"]))
    expect(targets).toHaveLength(1)
    expect(targets[0].configured).toBe(true)
    expect(targets[0].capability.support.tools).toBe("supported")
  })
})
