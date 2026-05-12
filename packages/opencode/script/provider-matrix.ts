import { Effect } from "effect"
import { Log } from "@opencode-ai/core/util/log"
import { AppRuntime } from "../src/effect/app-runtime"
import { WithInstance } from "../src/project/with-instance"
import { ProviderCapability } from "../src/provider/capability"
import { Provider } from "../src/provider/provider"

await Log.init({ print: false, dev: true, level: "ERROR" })

try {
  const providers = await WithInstance.provide({
    directory: process.cwd(),
    fn: () =>
      AppRuntime.runPromise(
        Effect.gen(function* () {
          const provider = yield* Provider.Service
          return yield* provider.list()
        }),
      ),
  })

  console.log(JSON.stringify(ProviderCapability.matrix(providers), null, 2))
} finally {
  await AppRuntime.dispose()
}
