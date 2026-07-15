import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { playbookFoldersHandler } from "#handlers/playbook-folders"
import {
  PlaybookFolderNotFoundError,
  playbooksHandler,
} from "#handlers/playbooks"
import { protectedProcedure } from "#index"

const uuidSchema = z.string().uuid()

const playbookSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  content: z.string(),
  folderId: uuidSchema.nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

const playbookFolderSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Playbook = z.infer<typeof playbookSchema>
export type PlaybookFolder = z.infer<typeof playbookFolderSchema>

const playbookInput = z.object({
  name: z.string().trim().min(1),
  description: z.string(),
  content: z.string().min(1),
  folderId: uuidSchema.nullable().optional(),
})

const folderInput = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
})

function handleFolderError(error: unknown): never {
  if (error instanceof PlaybookFolderNotFoundError) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Playbook folder not found",
    })
  }
  throw error
}

export const playbooksRouter = {
  folders: {
    create: protectedProcedure
      .route({
        summary: "Create a playbook folder",
        description: "Persists a flat folder used to organize playbooks.",
        tags: ["Playbooks"],
        method: "POST",
      })
      .input(folderInput)
      .output(playbookFolderSchema.nullable())
      .handler(async ({ input }) => {
        return playbookFoldersHandler.create(input)
      }),

    list: protectedProcedure
      .route({
        summary: "List playbook folders",
        description: "Returns every playbook folder ordered by name.",
        tags: ["Playbooks"],
        method: "GET",
      })
      .output(z.array(playbookFolderSchema))
      .handler(async () => {
        return playbookFoldersHandler.list()
      }),

    get: protectedProcedure
      .route({
        summary: "Get a playbook folder",
        description: "Returns a playbook folder by id, or null.",
        tags: ["Playbooks"],
        method: "GET",
      })
      .input(z.object({ id: uuidSchema }))
      .output(playbookFolderSchema.nullable())
      .handler(async ({ input }) => {
        return playbookFoldersHandler.get(input.id)
      }),

    update: protectedProcedure
      .route({
        summary: "Update a playbook folder",
        description: "Renames or updates a playbook folder.",
        tags: ["Playbooks"],
        method: "PUT",
      })
      .input(folderInput.extend({ id: uuidSchema }))
      .output(playbookFolderSchema.nullable())
      .handler(async ({ input }) => {
        const { id, ...folder } = input
        return playbookFoldersHandler.update(id, folder)
      }),

    delete: protectedProcedure
      .route({
        summary: "Delete a playbook folder",
        description:
          "Deletes a folder and moves its playbooks to the root through the database relation.",
        tags: ["Playbooks"],
        method: "DELETE",
      })
      .input(z.object({ id: uuidSchema }))
      .output(playbookFolderSchema.nullable())
      .handler(async ({ input }) => {
        return playbookFoldersHandler.delete(input.id)
      }),
  },

  create: protectedProcedure
    .route({
      summary: "Create a playbook",
      description: "Persists a new playbook (name, description, YAML content).",
      tags: ["Playbooks"],
      method: "POST",
    })
    .input(playbookInput)
    .output(playbookSchema.nullable())
    .errors({
      BAD_REQUEST: {
        message: "Playbook folder not found",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await playbooksHandler.create(input)
      } catch (error) {
        handleFolderError(error)
      }
    }),

  list: protectedProcedure
    .route({
      summary: "List playbooks",
      description: "Returns every stored playbook, ordered by creation time.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .output(z.array(playbookSchema))
    .handler(async () => {
      const playbooks = await playbooksHandler.list()
      return playbooks ?? []
    }),

  listByFolder: protectedProcedure
    .route({
      summary: "List playbooks by folder",
      description:
        "Returns playbooks in one folder, or root playbooks when folderId is null.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .input(z.object({ folderId: uuidSchema.nullable() }))
    .output(z.array(playbookSchema))
    .handler(async ({ input }) => {
      return playbooksHandler.listByFolder(input.folderId)
    }),

  get: protectedProcedure
    .route({
      summary: "Get a playbook",
      description:
        "Returns a single playbook by id, or null when no row matches.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .input(z.object({ id: z.string() }))
    .output(playbookSchema.nullable())
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.get(input.id)
      return playbook ?? null
    }),

  update: protectedProcedure
    .route({
      summary: "Update a playbook",
      description:
        "Replaces the name, description, and YAML content of an existing playbook.",
      tags: ["Playbooks"],
      method: "PUT",
    })
    .input(playbookInput.extend({ id: uuidSchema }))
    .output(playbookSchema.nullable())
    .errors({
      BAD_REQUEST: {
        message: "Playbook folder not found",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      const { id, ...playbook } = input
      try {
        return await playbooksHandler.update(id, playbook)
      } catch (error) {
        handleFolderError(error)
      }
    }),

  move: protectedProcedure
    .route({
      summary: "Move a playbook",
      description: "Moves a playbook to a folder or to the root.",
      tags: ["Playbooks"],
      method: "PUT",
    })
    .input(
      z.object({
        id: uuidSchema,
        folderId: uuidSchema.nullable(),
      })
    )
    .output(playbookSchema.nullable())
    .errors({
      BAD_REQUEST: {
        message: "Playbook folder not found",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await playbooksHandler.move(input.id, input.folderId)
      } catch (error) {
        handleFolderError(error)
      }
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete a playbook",
      description:
        "Deletes a playbook by id. Returns the deleted row, or null.",
      tags: ["Playbooks"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .output(playbookSchema.nullable())
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.delete(input.id)
      return playbook ?? null
    }),
}
