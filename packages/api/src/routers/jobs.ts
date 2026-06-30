import { z } from "zod"
import { jobRunsHandler, jobsHandler } from "@/handlers/jobs"
import { protectedProcedure } from "@/index"
import { startJobRun } from "@/jobs/executor"

const inventoryItemSchema = z.object({
  id: z.string(),
  type: z.enum(["group", "device"]),
})

const jobInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  playbookId: z.string().optional(),
  inventoryJson: z.array(inventoryItemSchema).default([]),
  extravarsJson: z.record(z.string(), z.string()).default({}),
  forks: z.number().int().min(1).default(1),
  cronExpression: z.string().optional(),
  enabled: z.boolean().default(true),
})

export const jobsRouter = {
  list: protectedProcedure
    .route({ summary: "List jobs", tags: ["Jobs"], method: "GET" })
    .handler(async () => {
      return jobsHandler.list()
    }),

  get: protectedProcedure
    .route({ summary: "Get a job", tags: ["Jobs"], method: "GET" })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      return jobsHandler.get(input.id)
    }),

  create: protectedProcedure
    .route({ summary: "Create a job", tags: ["Jobs"], method: "POST" })
    .input(jobInputSchema)
    .handler(async ({ input }) => {
      return jobsHandler.create({
        name: input.name,
        description: input.description ?? null,
        playbookId: input.playbookId ?? null,
        inventoryJson: input.inventoryJson,
        extravarsJson: input.extravarsJson as Record<string, string>,
        forks: input.forks,
        cronExpression: input.cronExpression ?? null,
        enabled: input.enabled,
      })
    }),

  update: protectedProcedure
    .route({ summary: "Update a job", tags: ["Jobs"], method: "PUT" })
    .input(jobInputSchema.extend({ id: z.string() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input
      return jobsHandler.update(id, {
        name: rest.name,
        description: rest.description ?? null,
        playbookId: rest.playbookId ?? null,
        inventoryJson: rest.inventoryJson,
        extravarsJson: rest.extravarsJson as Record<string, string>,
        forks: rest.forks,
        cronExpression: rest.cronExpression ?? null,
        enabled: rest.enabled,
      })
    }),

  delete: protectedProcedure
    .route({ summary: "Delete a job", tags: ["Jobs"], method: "DELETE" })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      return jobsHandler.delete(input.id)
    }),

  toggleEnabled: protectedProcedure
    .route({
      summary: "Toggle job enabled state",
      tags: ["Jobs"],
      method: "PUT",
    })
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .handler(async ({ input }) => {
      return jobsHandler.update(input.id, { enabled: input.enabled })
    }),

  run: protectedProcedure
    .route({
      summary: "Run a job now",
      description:
        "Triggers an immediate execution of the job's playbook against its inventory and records the run with its captured output.",
      tags: ["Jobs"],
      method: "POST",
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const runId = await executeJob(input.id, "manual")
      return { runId }
    }),

  runs: {
    list: protectedProcedure
      .route({ summary: "List runs for a job", tags: ["Jobs"], method: "GET" })
      .input(z.object({ jobId: z.string() }))
      .handler(async ({ input }) => {
        return jobRunsHandler.listByJob(input.jobId)
      }),

    get: protectedProcedure
      .route({ summary: "Get a job run", tags: ["Jobs"], method: "GET" })
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        return jobRunsHandler.get(input.id)
      }),
  },
}
