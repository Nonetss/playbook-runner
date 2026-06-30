import type { AppRouterClient } from "@playbook-runner/api/routers/index"

export type InventoryGroup = NonNullable<
  Awaited<ReturnType<AppRouterClient["inventory"]["groups"]["get"]>>
>

export type InventoryGroupList = Awaited<
  ReturnType<AppRouterClient["inventory"]["groups"]["list"]>
>

export type InventoryDevice = NonNullable<
  Awaited<ReturnType<AppRouterClient["inventory"]["devices"]["get"]>>
>

export type InventoryDeviceList = Awaited<
  ReturnType<AppRouterClient["inventory"]["devices"]["list"]>
>

export type InventoryDeviceGroup = NonNullable<
  Awaited<ReturnType<AppRouterClient["inventory"]["deviceGroups"]["assign"]>>
>
