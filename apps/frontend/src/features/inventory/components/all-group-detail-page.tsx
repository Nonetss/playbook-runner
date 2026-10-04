import { getIcon } from "@/lib/icon-registry"

const Computer = getIcon("resources", "device")

import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { SoftCardList } from "@/components/shared/data-display/soft-card-list"
import { StateCard } from "@/components/shared/feedback/state-card"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { useDevicesList } from "@/features/inventory/hooks/use-devices"

/**
 * Read-only detail of the built-in All group: it has no row to edit and no
 * assignments, it simply lists every device in the inventory.
 */
export function AllGroupDetail() {
  const { t } = useTranslation("inventory")
  const { data: devices = [], isPending, isError } = useDevicesList()

  return (
    <DetailFrame
      backHref="/inventory/groups"
      backLabel={t("group.back_to_groups")}
    >
      <PageHero
        surface="groups"
        title="All"
        description={t("all_group.description")}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Text as="h2" variant="label" tone="muted">
            {t("group.devices")}
          </Text>
          {isPending || isError ? null : (
            <Text
              as="span"
              variant="meta"
              tone="muted"
              className="tabular-nums"
            >
              {t("all_group.devices_count", { count: devices.length })}
            </Text>
          )}
        </div>
        <Text as="p" variant="meta" tone="muted">
          {t("all_group.detail_hint")}
        </Text>

        {isPending ? (
          <StateCard spinner title={t("group.detail_loading")} />
        ) : isError ? (
          <StateCard tone="destructive" title={t("group.detail_load_error")} />
        ) : devices.length === 0 ? (
          <StateCard
            icon={<Computer />}
            title={t("group.no_devices_in_inventory")}
            className="py-10"
          />
        ) : (
          <SoftCardList as="ul">
            {devices.map((device) => (
              <li key={device.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <Text
                    as="span"
                    variant="body"
                    className="block truncate font-medium"
                  >
                    {device.name}
                  </Text>
                  {device.description ? (
                    <Text
                      as="span"
                      variant="meta"
                      tone="muted"
                      className="block truncate"
                    >
                      {device.description}
                    </Text>
                  ) : null}
                </span>
                <Text variant="data" tone="muted" className="shrink-0">
                  {device.ipAddress}
                </Text>
              </li>
            ))}
          </SoftCardList>
        )}
      </section>
    </DetailFrame>
  )
}
