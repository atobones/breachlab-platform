export type RoleInputs = {
  isSupporter: boolean;
  hasFirstBlood: boolean;
  hasTrackComplete: boolean;
};

export type RoleIds = {
  supporter: string | null;
  firstBlood: string | null;
  ghostMaster: string | null;
};

export function computeExpectedRoles(
  input: RoleInputs,
  roleIds: RoleIds,
): string[] {
  const out: string[] = [];
  if (input.isSupporter && roleIds.supporter) out.push(roleIds.supporter);
  if (input.hasFirstBlood && roleIds.firstBlood) out.push(roleIds.firstBlood);
  if (input.hasTrackComplete && roleIds.ghostMaster) out.push(roleIds.ghostMaster);
  return out;
}
