import { defineRelations } from "drizzle-orm"

import * as schema from "@/schema"

export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    members: r.many.member(),
    teamMemberships: r.many.teamMember(),
    invitationsSent: r.many.invitation(),
    teams: r.many.team({
      from: r.user.id.through(r.teamMember.userId),
      to: r.team.id.through(r.teamMember.teamId),
    }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  organization: {
    organizationRoles: r.many.organizationRole(),
    teams: r.many.team(),
    members: r.many.member(),
    invitations: r.many.invitation(),
  },
  organizationRole: {
    organization: r.one.organization({
      from: r.organizationRole.organizationId,
      to: r.organization.id,
    }),
  },
  team: {
    organization: r.one.organization({
      from: r.team.organizationId,
      to: r.organization.id,
    }),
    teamMembers: r.many.teamMember(),
    members: r.many.user({
      from: r.team.id.through(r.teamMember.teamId),
      to: r.user.id.through(r.teamMember.userId),
    }),
  },
  teamMember: {
    team: r.one.team({
      from: r.teamMember.teamId,
      to: r.team.id,
    }),
    user: r.one.user({
      from: r.teamMember.userId,
      to: r.user.id,
    }),
  },
  member: {
    organization: r.one.organization({
      from: r.member.organizationId,
      to: r.organization.id,
    }),
    user: r.one.user({
      from: r.member.userId,
      to: r.user.id,
    }),
  },
  invitation: {
    organization: r.one.organization({
      from: r.invitation.organizationId,
      to: r.organization.id,
    }),
    inviter: r.one.user({
      from: r.invitation.inviterId,
      to: r.user.id,
    }),
  },
  credentials: {},
  playbooks: {},
  inventoryDeviceGroups: {
    device: r.one.inventoryDevices({
      from: r.inventoryDeviceGroups.deviceId,
      to: r.inventoryDevices.id,
    }),
    group: r.one.inventoryGroups({
      from: r.inventoryDeviceGroups.groupId,
      to: r.inventoryGroups.id,
    }),
  },
  inventoryDevices: {
    inventoryDeviceGroups: r.many.inventoryDeviceGroups(),
  },
  inventoryGroups: {
    inventoryDeviceGroups: r.many.inventoryDeviceGroups(),
  },
}))
