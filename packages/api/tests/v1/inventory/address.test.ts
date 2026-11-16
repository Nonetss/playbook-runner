import { describe, expect, test } from "bun:test"
import { hostAddress, isHostname } from "#v1/inventory/address"

describe("hostAddress", () => {
  test.each([
    ["10.0.0.10", "10.0.0.10"],
    ["10.0.0.10/32", "10.0.0.10"],
    ["10.0.0.0/24", "10.0.0.0"],
    ["2001:db8::1", "2001:db8::1"],
    ["2001:db8::1/128", "2001:db8::1"],
  ])("%s connects to %s", (value, expected) => {
    expect(hostAddress(value)).toBe(expected)
  })
})

describe("isHostname", () => {
  test.each([
    "web",
    "web-1",
    "web.example.com",
    "Web-1.Example.COM",
    "web.example.com.",
    "a".repeat(63),
    "10.0.0.x",
    "xn--bcher-kva.example",
  ])("%s is a DNS name", (value) => {
    expect(isHostname(value)).toBe(true)
  })

  test.each([
    "",
    ".",
    "web..example.com",
    ".example.com",
    "-web.example.com",
    "web-.example.com",
    "web_1.example.com",
    "web example.com",
    "web.example.com/24",
    "web.example.com:22",
    "http://web.example.com",
    "10.0.0.256",
    "1.2",
    "123",
    "a".repeat(64),
    `${"a.".repeat(127)}aa`,
  ])("%j is not a DNS name", (value) => {
    expect(isHostname(value)).toBe(false)
  })
})
