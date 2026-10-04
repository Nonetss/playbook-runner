// Behaviour of every CopyButton: copy, confirm for two seconds, and fall back
// to selecting the text when the clipboard API is unavailable.
export function bindCopyButtons(root: ParentNode = document): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-copy-button]:not([data-bound])"
  )) {
    button.toggleAttribute("data-bound", true)
    let timer: ReturnType<typeof setTimeout> | undefined
    const code = () =>
      button.closest("[data-copy-scope]")?.querySelector("code") ?? null

    button.addEventListener("click", async () => {
      const text = button.dataset.copy ?? code()?.innerText.trimEnd() ?? ""
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // Clipboard blocked (insecure context, permissions): select the text
        // so the visitor can copy it by hand.
        const target = code()
        if (target) getSelection()?.selectAllChildren(target)
        return
      }
      const label = button.querySelector<HTMLElement>("[data-label]")
      const idle = button.querySelector("[data-icon=idle]")
      const done = button.querySelector("[data-icon=done]")
      const set = (copied: boolean) => {
        if (label)
          label.textContent =
            (copied ? label.dataset.done : label.dataset.idle) ?? ""
        idle?.classList.toggle("hidden", copied)
        done?.classList.toggle("hidden", !copied)
      }
      set(true)
      clearTimeout(timer)
      timer = setTimeout(() => set(false), 2000)
    })
  }
}
