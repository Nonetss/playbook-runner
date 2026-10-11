import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { auth } from "@playbook-runner/auth"
import {
  createdApiKey,
  listedApiKey,
  listedApiKeys,
} from "#tests/fixtures/auth"
import { userContext } from "#tests/fixtures/context"
import { apiKeyHandler } from "#v1/api-key/handler"

const context = userContext()

const listApiKeys = spyOn(auth.api, "listApiKeys")
const createApiKey = spyOn(auth.api, "createApiKey")
const deleteApiKey = spyOn(auth.api, "deleteApiKey")

afterEach(() => {
  listApiKeys.mockReset()
  createApiKey.mockReset()
  deleteApiKey.mockReset()
})

describe("apiKeys.list", () => {
  test("returns the caller's keys, asked with the caller's headers", async () => {
    const key = listedApiKey()
    listApiKeys.mockResolvedValue(listedApiKeys([key]))

    expect(await apiKeyHandler.list({ context })).toEqual([key])
    expect(listApiKeys.mock.calls[0]?.[0]).toEqual({
      headers: context.headers,
    })
  })

  test("an empty answer becomes an empty list", async () => {
    listApiKeys.mockResolvedValue(listedApiKeys([]))

    expect(await apiKeyHandler.list({ context })).toEqual([])
  })
})

describe("apiKeys.create", () => {
  test("creates a default-config key with the given name and expiry", async () => {
    const created = createdApiKey()
    createApiKey.mockResolvedValue(created)

    const result = await apiKeyHandler.create({
      context,
      input: { name: "CI deploy", expiresIn: 3600 },
    })

    expect(result).toEqual(created)
    expect(createApiKey.mock.calls[0]?.[0]).toEqual({
      headers: context.headers,
      body: { configId: "default", name: "CI deploy", expiresIn: 3600 },
    })
  })

  test("omits expiresIn when no expiry is asked for", async () => {
    createApiKey.mockResolvedValue(createdApiKey())

    await apiKeyHandler.create({ context, input: { name: "forever" } })

    expect(createApiKey.mock.calls[0]?.[0]).toEqual({
      headers: context.headers,
      body: { configId: "default", name: "forever" },
    })
  })
})

describe("apiKeys.delete", () => {
  test("deletes the key by id and reports success", async () => {
    deleteApiKey.mockResolvedValue({ success: true })

    expect(
      await apiKeyHandler.delete({ context, input: { id: "key-1" } })
    ).toEqual({ id: "key-1", success: true })
    expect(deleteApiKey.mock.calls[0]?.[0]).toEqual({
      headers: context.headers,
      body: { keyId: "key-1" },
    })
  })

  test("reports failure when Better Auth does not confirm the delete", async () => {
    deleteApiKey.mockResolvedValue({ success: false })

    expect(
      await apiKeyHandler.delete({ context, input: { id: "key-1" } })
    ).toEqual({ id: "key-1", success: false })
  })
})
