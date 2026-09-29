import { protectedProcedure } from "#index"
import { playbooksHandler } from "#v1/playbooks/handler"
import { playbooksInput } from "#v1/playbooks/input"
import { playbooksOutput } from "#v1/playbooks/output"

export type { Playbook, PlaybookFolder } from "#v1/playbooks/output"

const folderNotFound = {
  BAD_REQUEST: { message: "Playbook folder not found", status: 400 },
} as const

export const playbooksRouter = {
  folders: {
    create: protectedProcedure
      .route({
        summary: "Create a playbook folder",
        description: "Persists a flat folder used to organize playbooks.",
        tags: ["Playbooks"],
        method: "POST",
      })
      .input(playbooksInput.folders.create)
      .output(playbooksOutput.folders.create)
      .handler(({ context, input }) =>
        playbooksHandler.folders.create({ context, input })
      ),

    list: protectedProcedure
      .route({
        summary: "List playbook folders",
        description: "Returns every playbook folder ordered by name.",
        tags: ["Playbooks"],
        method: "GET",
      })
      .output(playbooksOutput.folders.list)
      .handler(({ context }) => playbooksHandler.folders.list({ context })),

    get: protectedProcedure
      .route({
        summary: "Get a playbook folder",
        description: "Returns a playbook folder by id. NOT_FOUND when missing.",
        tags: ["Playbooks"],
        method: "GET",
      })
      .input(playbooksInput.folders.get)
      .output(playbooksOutput.folders.get)
      .handler(({ context, input }) =>
        playbooksHandler.folders.get({ context, input })
      ),

    update: protectedProcedure
      .route({
        summary: "Update a playbook folder",
        description:
          "Renames or updates a playbook folder. NOT_FOUND when missing.",
        tags: ["Playbooks"],
        method: "PUT",
      })
      .input(playbooksInput.folders.update)
      .output(playbooksOutput.folders.update)
      .handler(({ context, input }) =>
        playbooksHandler.folders.update({ context, input })
      ),

    delete: protectedProcedure
      .route({
        summary: "Delete a playbook folder",
        description:
          "Deletes a folder and moves its playbooks to the root through the database relation. NOT_FOUND when missing.",
        tags: ["Playbooks"],
        method: "DELETE",
      })
      .input(playbooksInput.folders.delete)
      .output(playbooksOutput.folders.delete)
      .handler(({ context, input }) =>
        playbooksHandler.folders.delete({ context, input })
      ),
  },

  create: protectedProcedure
    .route({
      summary: "Create a playbook",
      description: "Persists a new playbook (name, description, YAML content).",
      tags: ["Playbooks"],
      method: "POST",
    })
    .errors(folderNotFound)
    .input(playbooksInput.create)
    .output(playbooksOutput.create)
    .handler(({ context, input }) =>
      playbooksHandler.create({ context, input })
    ),

  list: protectedProcedure
    .route({
      summary: "List playbooks",
      description: "Returns every stored playbook, ordered by creation time.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .output(playbooksOutput.list)
    .handler(({ context }) => playbooksHandler.list({ context })),

  listByFolder: protectedProcedure
    .route({
      summary: "List playbooks by folder",
      description:
        "Returns the inline playbooks in one folder, or root inline playbooks when folderId is null. Git-sourced playbooks are listed per repository.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .input(playbooksInput.listByFolder)
    .output(playbooksOutput.listByFolder)
    .handler(({ context, input }) =>
      playbooksHandler.listByFolder({ context, input })
    ),

  get: protectedProcedure
    .route({
      summary: "Get a playbook",
      description: "Returns a single playbook by id. NOT_FOUND when missing.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .input(playbooksInput.get)
    .output(playbooksOutput.get)
    .handler(({ context, input }) => playbooksHandler.get({ context, input })),

  update: protectedProcedure
    .route({
      summary: "Update a playbook",
      description:
        "Replaces the name, description, and YAML content of an existing playbook. NOT_FOUND when missing, FORBIDDEN for Git-sourced playbooks.",
      tags: ["Playbooks"],
      method: "PUT",
    })
    .errors(folderNotFound)
    .input(playbooksInput.update)
    .output(playbooksOutput.update)
    .handler(({ context, input }) =>
      playbooksHandler.update({ context, input })
    ),

  move: protectedProcedure
    .route({
      summary: "Move a playbook",
      description:
        "Moves a playbook to a folder or to the root. NOT_FOUND when missing, FORBIDDEN for Git-sourced playbooks.",
      tags: ["Playbooks"],
      method: "PUT",
    })
    .errors(folderNotFound)
    .input(playbooksInput.move)
    .output(playbooksOutput.move)
    .handler(({ context, input }) => playbooksHandler.move({ context, input })),

  delete: protectedProcedure
    .route({
      summary: "Delete a playbook",
      description:
        "Deletes a playbook by id and returns the deleted row. NOT_FOUND when missing, FORBIDDEN for Git-sourced playbooks.",
      tags: ["Playbooks"],
      method: "DELETE",
    })
    .input(playbooksInput.delete)
    .output(playbooksOutput.delete)
    .handler(({ context, input }) =>
      playbooksHandler.delete({ context, input })
    ),
}
