/**
 * The section sidebar and its mobile trigger are separate islands (the
 * sidebar persists across navigations, the page does not), so they cannot
 * share React context. The trigger dispatches this document event and the
 * sidebar island toggles itself.
 */
export const SIDEBAR_TOGGLE_EVENT = "app:toggle-section-sidebar"

export function toggleSectionSidebar() {
  document.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT))
}
