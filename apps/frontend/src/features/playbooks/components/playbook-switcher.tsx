import { PlaybookPicker } from "@/features/playbooks/components/playbook-picker"
import { navigate } from "@/lib/navigate"

type PlaybookSwitcherProps = {
  currentId: string
  disabled?: boolean
}

/** Run-page switcher: picking another playbook opens its run page. */
export function PlaybookSwitcher({
  currentId,
  disabled = false,
}: PlaybookSwitcherProps) {
  return (
    <PlaybookPicker
      value={currentId}
      size="sm"
      disabled={disabled}
      onChange={(playbookId) =>
        navigate(`/playbooks/${playbookId}/run${window.location.search}`)
      }
    />
  )
}
