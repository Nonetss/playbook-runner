import type { AppRouterClient } from "@playbook-runner/api/v1/router"

export type Credential = Awaited<
  ReturnType<AppRouterClient["credentials"]["list"]>
>[number]

export type CredentialType = Credential["type"]

/** What a credential is for: a host Ansible logs in to, or a Git remote. */
export type CredentialScope = Credential["scope"]

/** What the user types in to create a credential. */
export type CredentialCreateInput =
  | {
      type: "ssh_key"
      scope: CredentialScope
      name: string
      username: string
      privateKey: string
      publicKey: string
    }
  | {
      type: "token"
      scope: "git"
      name: string
      username: string
      token: string
    }
