import { createMemo, For, Match, Show, Switch } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@opencode-ai/ui/button"
import { Logo } from "@opencode-ai/ui/logo"
import { TextField } from "@opencode-ai/ui/text-field"
import { useLayout } from "@/context/layout"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { Icon } from "@opencode-ai/ui/icon"
import { usePlatform } from "@/context/platform"
import { DateTime } from "luxon"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { DialogSelectDirectory } from "@/components/dialog-select-directory"
import { DialogSelectServer } from "@/components/dialog-select-server"
import { useServer } from "@/context/server"
import { useGlobalSync } from "@/context/global-sync"
import { useLanguage } from "@/context/language"

export default function Home() {
  const sync = useGlobalSync()
  const layout = useLayout()
  const platform = usePlatform()
  const dialog = useDialog()
  const navigate = useNavigate()
  const server = useServer()
  const language = useLanguage()
  const [store, setStore] = createStore({
    filter: "",
  })
  const homedir = createMemo(() => sync.data.path.home)
  const projects = createMemo(() => {
    return sync.data.project
      .slice()
      .sort((a, b) => (b.time.updated ?? b.time.created) - (a.time.updated ?? a.time.created))
  })
  const recent = createMemo(() => {
    const query = store.filter.trim().toLowerCase()
    const list = projects()
    if (!query) return list.slice(0, 8)
    return list.filter((project) => project.worktree.replace(homedir(), "~").toLowerCase().includes(query)).slice(0, 12)
  })

  const serverDotClass = createMemo(() => {
    const healthy = server.healthy()
    if (healthy === true) return "bg-icon-success-base"
    if (healthy === false) return "bg-icon-critical-base"
    return "bg-border-weak-base"
  })

  function openProject(directory: string) {
    layout.projects.open(directory)
    server.projects.touch(directory)
    navigate(`/${base64Encode(directory)}`)
  }

  async function chooseProject() {
    function resolve(result: string | string[] | null) {
      if (Array.isArray(result)) {
        for (const directory of result) {
          openProject(directory)
        }
      } else if (result) {
        openProject(result)
      }
    }

    if (platform.openDirectoryPickerDialog && server.isLocal()) {
      const result = await platform.openDirectoryPickerDialog?.({
        title: language.t("command.project.open"),
        multiple: true,
      })
      resolve(result)
    } else {
      dialog.show(
        () => <DialogSelectDirectory multiple={true} onSelect={resolve} />,
        () => resolve(null),
      )
    }
  }

  return (
    <div class="mx-auto flex h-full w-full max-w-3xl flex-col px-4 py-10 md:justify-center md:py-14">
      <div class="flex items-center justify-between gap-4">
        <Logo class="w-42 opacity-16 md:w-60" />
        <Button
          size="large"
          variant="ghost"
          class="min-w-0 text-14-regular text-text-weak"
          onClick={() => dialog.show(() => <DialogSelectServer />)}
        >
          <div
            classList={{
              "size-2 rounded-full shrink-0": true,
              [serverDotClass()]: true,
            }}
          />
          <span class="truncate">{server.name}</span>
        </Button>
      </div>

      <div class="mt-10 grid gap-3 rounded-lg border border-border-weaker-base bg-background-stronger p-3 shadow-xs-border-base">
        <div class="flex flex-col gap-2 sm:flex-row">
          <Button
            icon="folder-add-left"
            size="large"
            variant="primary"
            class="justify-center px-4"
            onClick={chooseProject}
          >
            {language.t("command.project.open")}
          </Button>
          <Button
            size="large"
            variant="secondary"
            class="justify-center px-4"
            onClick={() => dialog.show(() => <DialogSelectServer />)}
          >
            {language.t("command.server.switch")}
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-2 text-12-regular text-text-weak sm:grid-cols-3">
          <div class="rounded-md bg-surface-base px-3 py-2">
            <div class="text-text-strong">{projects().length}</div>
            <div>{language.t("home.hub.projects")}</div>
          </div>
          <div class="rounded-md bg-surface-base px-3 py-2">
            <div class="text-text-strong">
              {server.healthy() === false ? language.t("home.hub.offline") : language.t("home.hub.online")}
            </div>
            <div>{language.t("home.hub.server")}</div>
          </div>
          <div class="col-span-2 rounded-md bg-surface-base px-3 py-2 sm:col-span-1">
            <div class="truncate text-text-strong">{server.name}</div>
            <div>{language.t("home.hub.activeServer")}</div>
          </div>
        </div>
      </div>

      <Switch>
        <Match when={sync.data.project.length > 0}>
          <div class="mt-8 w-full flex flex-col gap-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-14-medium text-text-strong">{language.t("home.recentProjects")}</div>
              <div class="flex h-9 min-w-0 items-center gap-2 rounded-lg bg-surface-base px-3 sm:w-72">
                <Icon name="magnifying-glass" class="shrink-0 text-icon-weak-base" />
                <TextField
                  variant="ghost"
                  type="text"
                  value={store.filter}
                  onChange={(value) => setStore("filter", value)}
                  placeholder={language.t("home.search.placeholder")}
                  spellcheck={false}
                  autocorrect="off"
                  autocomplete="off"
                  autocapitalize="off"
                  class="flex-1"
                />
              </div>
            </div>
            <ul class="flex flex-col gap-2">
              <For each={recent()}>
                {(project) => (
                  <Button
                    size="large"
                    variant="ghost"
                    class="min-w-0 text-14-mono text-left justify-between px-3"
                    onClick={() => openProject(project.worktree)}
                  >
                    <span class="truncate">{project.worktree.replace(homedir(), "~")}</span>
                    <div class="shrink-0 text-14-regular text-text-weak">
                      {DateTime.fromMillis(project.time.updated ?? project.time.created).toRelative()}
                    </div>
                  </Button>
                )}
              </For>
            </ul>
            <Show when={store.filter && recent().length === 0}>
              <div class="rounded-lg border border-border-weaker-base py-10 text-center text-14-regular text-text-weak">
                {language.t("home.search.empty")}
              </div>
            </Show>
          </div>
        </Match>
        <Match when={!sync.ready}>
          <div class="mt-8 mx-auto flex flex-col items-center gap-3">
            <div class="text-12-regular text-text-weak">{language.t("common.loading")}</div>
            <Button class="px-3" onClick={chooseProject}>
              {language.t("command.project.open")}
            </Button>
          </div>
        </Match>
        <Match when={true}>
          <div class="mt-8 mx-auto flex flex-col items-center gap-3 rounded-lg border border-border-weaker-base px-8 py-10">
            <Icon name="folder-add-left" size="large" />
            <div class="flex flex-col gap-1 items-center justify-center">
              <div class="text-14-medium text-text-strong">{language.t("home.empty.title")}</div>
              <div class="text-12-regular text-text-weak">{language.t("home.empty.description")}</div>
            </div>
            <Button class="px-3 mt-1" onClick={chooseProject}>
              {language.t("command.project.open")}
            </Button>
          </div>
        </Match>
      </Switch>
    </div>
  )
}
