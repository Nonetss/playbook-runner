import { describe, expect, test } from "bun:test"
import { selectableRoles } from "@/features/playbooks/lib/playbook-roles"

const nginx = { name: "nginx", path: "roles/nginx", description: null }
const docker = { name: "docker", path: "roles/docker", description: "Docker" }
const listing = (declared: string[], dynamic = false) => ({
  commit: "abc",
  requirementsFiles: [],
  roles: [nginx, docker],
  playbookRoles: [{ path: "site.yml", roles: declared, dynamic }],
})

describe("selectableRoles", () => {
  test("returns the roles the playbook declares, in its order", () => {
    expect(selectableRoles(listing(["docker", "nginx"]), "site.yml")).toEqual([
      docker,
      nginx,
    ])
  })

  test("leaves out the repository's roles it does not declare", () => {
    expect(selectableRoles(listing(["nginx"]), "site.yml")).toEqual([nginx])
  })

  test("leaves out roles that are not in the repository", () => {
    expect(
      selectableRoles(listing(["community.general.x", "nginx"]), "site.yml")
    ).toEqual([nginx])
  })

  test("a playbook that declares none has nothing to select", () => {
    expect(selectableRoles(listing(["nginx"]), "other.yml")).toEqual([])
    expect(selectableRoles(listing(["nginx"]), null)).toEqual([])
  })
})
