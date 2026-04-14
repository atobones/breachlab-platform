export type RoleInputs = {
  isSupporter: boolean;
  hasFirstBlood: boolean;
  hasTrackComplete: boolean;
  hasGhostGraduate: boolean;
  hasPhantomMaster: boolean;
};

export type RoleIds = {
  operative: string | null;
  supporter: string | null;
  firstBlood: string | null;
  ghostMaster: string | null;
  phantomOperative: string | null;
};

/**
 * Every linked Discord user gets Operative by default. Additional roles
 * are layered on top based on badges earned on the platform. Ghost Master
 * is awarded for clearing the hidden Ghost graduation; Phantom Operative
 * for clearing the Phantom graduation.
 */
export function computeExpectedRoles(
  input: RoleInputs,
  roleIds: RoleIds,
): string[] {
  const out: string[] = [];
  if (roleIds.operative) out.push(roleIds.operative);
  if (input.isSupporter && roleIds.supporter) out.push(roleIds.supporter);
  if (input.hasFirstBlood && roleIds.firstBlood) out.push(roleIds.firstBlood);
  if (input.hasGhostGraduate && roleIds.ghostMaster) out.push(roleIds.ghostMaster);
  if (input.hasPhantomMaster && roleIds.phantomOperative) out.push(roleIds.phantomOperative);
  return out;
}
