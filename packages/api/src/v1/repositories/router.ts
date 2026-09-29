import { protectedProcedure } from "#index"
import { repositoriesHandler } from "#v1/repositories/handler"
import { repositoriesInput } from "#v1/repositories/input"
import { repositoriesOutput } from "#v1/repositories/output"

export type {
  PlaybookRepository,
  PlaybookRepositoryWithCount,
  RepositorySyncResult,
} from "#v1/repositories/output"

export const repositoriesRouter = {
  create: protectedProcedure
    .route({
      summary: "Register a playbook repository",
      description:
        "Persists a Git repository (https://, ssh:// or user@host:path URL, branch, optional subdirectory and SSH credential) whose playbooks are synced as read-only playbooks. BAD_REQUEST for an invalid URL or unknown credential.",
      tags: ["Repositories"],
      method: "POST",
    })
    .input(repositoriesInput.create)
    .output(repositoriesOutput.create)
    .handler(({ context, input }) =>
      repositoriesHandler.create({ context, input })
    ),

  list: protectedProcedure
    .route({
      summary: "List playbook repositories",
      description:
        "Returns every repository ordered by name, with its sync state and the number of synced (not missing) playbooks.",
      tags: ["Repositories"],
      method: "GET",
    })
    .output(repositoriesOutput.list)
    .handler(({ context }) => repositoriesHandler.list({ context })),

  get: protectedProcedure
    .route({
      summary: "Get a playbook repository",
      description: "Returns a repository by id. NOT_FOUND when missing.",
      tags: ["Repositories"],
      method: "GET",
    })
    .input(repositoriesInput.get)
    .output(repositoriesOutput.get)
    .handler(({ context, input }) =>
      repositoriesHandler.get({ context, input })
    ),

  update: protectedProcedure
    .route({
      summary: "Update a playbook repository",
      description:
        "Replaces the repository settings. Takes effect on the next sync; runs keep using the last synced commit. NOT_FOUND when missing.",
      tags: ["Repositories"],
      method: "PUT",
    })
    .input(repositoriesInput.update)
    .output(repositoriesOutput.update)
    .handler(({ context, input }) =>
      repositoriesHandler.update({ context, input })
    ),

  delete: protectedProcedure
    .route({
      summary: "Delete a playbook repository",
      description:
        "Deletes a repository, its synced playbooks (jobs using them keep a null playbook) and its cached mirror. NOT_FOUND when missing.",
      tags: ["Repositories"],
      method: "DELETE",
    })
    .input(repositoriesInput.delete)
    .output(repositoriesOutput.delete)
    .handler(({ context, input }) =>
      repositoriesHandler.delete({ context, input })
    ),

  sync: protectedProcedure
    .route({
      summary: "Sync a playbook repository",
      description:
        "Fetches the branch, records its head commit and upserts one read-only playbook per discovered playbook file; files gone upstream are deleted, or flagged missing while a job still uses them. BAD_REQUEST for authentication, URL or branch errors, TOO_MANY_REQUESTS when the runner is busy, BAD_GATEWAY when the Git host or runner is unreachable. NOT_FOUND when missing.",
      tags: ["Repositories"],
      method: "POST",
    })
    .input(repositoriesInput.sync)
    .output(repositoriesOutput.sync)
    .handler(({ context, input }) =>
      repositoriesHandler.sync({ context, input })
    ),

  branches: protectedProcedure
    .route({
      summary: "List a remote's branches",
      description:
        "Lists the branches of a Git URL (optionally with an SSH credential) and its default branch, without saving anything. BAD_REQUEST for authentication or URL errors, BAD_GATEWAY when the Git host or runner is unreachable.",
      tags: ["Repositories"],
      method: "GET",
    })
    .input(repositoriesInput.branches)
    .output(repositoriesOutput.branches)
    .handler(({ context, input }) =>
      repositoriesHandler.branches({ context, input })
    ),

  playbooks: protectedProcedure
    .route({
      summary: "List a repository's playbooks",
      description:
        "Returns the Git-sourced playbooks of a repository ordered by path, including missing ones. NOT_FOUND when the repository is missing.",
      tags: ["Repositories"],
      method: "GET",
    })
    .input(repositoriesInput.playbooks)
    .output(repositoriesOutput.playbooks)
    .handler(({ context, input }) =>
      repositoriesHandler.playbooks({ context, input })
    ),
}
