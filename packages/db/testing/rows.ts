/** Complete rows with fixed defaults, for queueing on the fake database. */
import type {
  credentials,
  infisicalConnections,
  inventoryDeviceGroups,
  inventoryDevices,
  inventoryGroups,
  jobRuns,
  jobSecretVariables,
  jobs,
  playbookFolders,
  playbookRepositories,
  playbookSecretVariables,
  playbooks,
  scripts,
} from "#schema/index"

export type CredentialRow = typeof credentials.$inferSelect
export type InfisicalConnectionRow = typeof infisicalConnections.$inferSelect
export type DeviceRow = typeof inventoryDevices.$inferSelect
export type GroupRow = typeof inventoryGroups.$inferSelect
export type DeviceGroupRow = typeof inventoryDeviceGroups.$inferSelect
export type PlaybookRow = typeof playbooks.$inferSelect
export type PlaybookFolderRow = typeof playbookFolders.$inferSelect
export type RepositoryRow = typeof playbookRepositories.$inferSelect
export type ScriptRow = typeof scripts.$inferSelect
export type JobRow = typeof jobs.$inferSelect
export type JobRunRow = typeof jobRuns.$inferSelect
export type PlaybookSecretVariableRow =
  typeof playbookSecretVariables.$inferSelect
export type JobSecretVariableRow = typeof jobSecretVariables.$inferSelect

export const NOW = new Date("2026-01-01T00:00:00.000Z")

// Fixed UUIDs, so rows pass `idSchema` when a test feeds their id back as
// input.
export const IDS = {
  credential: "00000000-0000-4000-8000-000000000001",
  device: "00000000-0000-4000-8000-000000000002",
  group: "00000000-0000-4000-8000-000000000003",
  deviceGroup: "00000000-0000-4000-8000-000000000004",
  playbook: "00000000-0000-4000-8000-000000000005",
  folder: "00000000-0000-4000-8000-000000000006",
  repository: "00000000-0000-4000-8000-000000000007",
  script: "00000000-0000-4000-8000-000000000008",
  job: "00000000-0000-4000-8000-000000000009",
  jobRun: "00000000-0000-4000-8000-00000000000a",
  infisicalConnection: "00000000-0000-4000-8000-00000000000b",
  playbookSecretVariable: "00000000-0000-4000-8000-00000000000c",
  jobSecretVariable: "00000000-0000-4000-8000-00000000000d",
} as const

export function credentialRow(
  overrides: Partial<CredentialRow> = {}
): CredentialRow {
  return {
    id: IDS.credential,
    name: "deploy",
    username: "ansible",
    privateKey: "v1:encrypted-private-key",
    publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample deploy",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function infisicalConnectionRow(
  overrides: Partial<InfisicalConnectionRow> = {}
): InfisicalConnectionRow {
  return {
    id: IDS.infisicalConnection,
    name: "production",
    url: "https://app.infisical.com",
    clientId: "client-id",
    clientSecret: "v1:encrypted-client-secret",
    projectId: "project-id",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function playbookSecretVariableRow(
  overrides: Partial<PlaybookSecretVariableRow> = {}
): PlaybookSecretVariableRow {
  return {
    id: IDS.playbookSecretVariable,
    playbookId: IDS.playbook,
    variableName: "db_password",
    secretName: "DB_PASSWORD",
    secretPath: "/",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function jobSecretVariableRow(
  overrides: Partial<JobSecretVariableRow> = {}
): JobSecretVariableRow {
  return {
    id: IDS.jobSecretVariable,
    jobId: IDS.job,
    variableName: "api_token",
    secretName: "API_TOKEN",
    secretPath: "/",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function deviceRow(overrides: Partial<DeviceRow> = {}): DeviceRow {
  return {
    id: IDS.device,
    name: "web-1",
    description: null,
    ipAddress: "10.0.0.10",
    portSSH: 22,
    credentialId: IDS.credential,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function groupRow(overrides: Partial<GroupRow> = {}): GroupRow {
  return {
    id: IDS.group,
    name: "web",
    description: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function deviceGroupRow(
  overrides: Partial<DeviceGroupRow> = {}
): DeviceGroupRow {
  return {
    id: IDS.deviceGroup,
    deviceId: IDS.device,
    groupId: IDS.group,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function playbookRow(overrides: Partial<PlaybookRow> = {}): PlaybookRow {
  return {
    id: IDS.playbook,
    name: "site.yml",
    description: null,
    content: "- hosts: all\n  tasks: []\n",
    folderId: null,
    source: "inline",
    repositoryId: null,
    path: null,
    missing: false,
    infisicalConnectionId: null,
    infisicalEnvironment: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function playbookFolderRow(
  overrides: Partial<PlaybookFolderRow> = {}
): PlaybookFolderRow {
  return {
    id: IDS.folder,
    name: "Maintenance",
    description: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function repositoryRow(
  overrides: Partial<RepositoryRow> = {}
): RepositoryRow {
  return {
    id: IDS.repository,
    name: "infra",
    url: "https://git.example.com/infra.git",
    branch: "main",
    subdir: null,
    credentialId: null,
    vaultPassword: null,
    lastCommitSha: null,
    lastSyncedAt: null,
    lastSyncError: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function scriptRow(overrides: Partial<ScriptRow> = {}): ScriptRow {
  return {
    id: IDS.script,
    name: "uptime",
    description: null,
    content: "uptime\n",
    language: "bash",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function jobRow(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: IDS.job,
    name: "Nightly patch",
    description: null,
    playbookId: IDS.playbook,
    inventoryJson: [{ type: "all" }],
    extravarsJson: {},
    forks: 1,
    cronExpression: null,
    enabled: true,
    infisicalConnectionId: null,
    infisicalEnvironment: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function jobRunRow(overrides: Partial<JobRunRow> = {}): JobRunRow {
  return {
    id: IDS.jobRun,
    jobId: IDS.job,
    status: "running",
    trigger: "manual",
    eventsJson: [],
    error: null,
    hostsOk: null,
    hostsFailed: null,
    commitSha: null,
    startedAt: NOW,
    finishedAt: null,
    createdAt: NOW,
    ...overrides,
  }
}
