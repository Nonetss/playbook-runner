import { describe, expect, test } from "bun:test"
import {
  groupedVariables,
  offeredVariables,
  selectableRoles,
} from "@/features/playbooks/lib/playbook-roles"

const nginx = { name: "nginx", path: "roles/nginx", description: null }
const docker = { name: "docker", path: "roles/docker", description: "Docker" }
const listing = (declared: string[], dynamic = false) => ({
  commit: "abc",
  requirementsFiles: [],
  roles: [nginx, docker],
  playbookRoles: [{ path: "site.yml", roles: declared, dynamic }],
  playbookVariables: [],
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

describe("offeredVariables", () => {
  const fromPlay = { name: "port", value: "80", role: null, usedOnly: false }
  const fromRole = {
    name: "port",
    value: "8080",
    role: "nginx",
    usedOnly: false,
  }
  const roleOnly = {
    name: "root",
    value: "/srv",
    role: "nginx",
    usedOnly: false,
  }
  const none = new Set<string>()

  test("keeps one per name, the first one", () => {
    expect(offeredVariables([fromPlay, fromRole], none, none)).toEqual([
      fromPlay,
    ])
  })

  test("leaves out the variables of an unchecked role", () => {
    expect(
      offeredVariables([fromPlay, roleOnly], new Set(["nginx"]), none)
    ).toEqual([fromPlay])
  })

  test("another role's variable is offered when the first one is unchecked", () => {
    const other = { name: "port", value: "9", role: "docker", usedOnly: false }
    expect(
      offeredVariables([fromRole, other], new Set(["nginx"]), none)
    ).toEqual([other])
  })

  test("leaves out the names that already have a row", () => {
    expect(
      offeredVariables([fromPlay, roleOnly], none, new Set(["port"]))
    ).toEqual([roleOnly])
  })
})

describe("groupedVariables", () => {
  const variable = (name: string, role: string | null, usedOnly = false) => ({
    name,
    value: null,
    role,
    usedOnly,
  })

  test("what nothing defines comes first, then the play, then each role", () => {
    const fromPlay = variable("port", null)
    const nginx = variable("root", "nginx")
    const docker = variable("image", "docker")
    const needed = variable("token", "docker", true)

    expect(groupedVariables([fromPlay, nginx, docker, needed])).toEqual([
      { kind: "undefined", role: null, variables: [needed] },
      { kind: "play", role: null, variables: [fromPlay] },
      { kind: "role", role: "nginx", variables: [nginx] },
      { kind: "role", role: "docker", variables: [docker] },
    ])
  })

  test("a role with only undefined variables has no group of its own", () => {
    const needed = variable("token", "docker", true)
    expect(groupedVariables([needed])).toEqual([
      { kind: "undefined", role: null, variables: [needed] },
    ])
  })

  test("keeps the variables of a role together and in order", () => {
    const first = variable("a", "nginx")
    const second = variable("b", "nginx")
    expect(groupedVariables([first, second])).toEqual([
      { kind: "role", role: "nginx", variables: [first, second] },
    ])
  })

  test("nothing to show means no groups", () => {
    expect(groupedVariables([])).toEqual([])
  })
})
