/**
 * Canonical flag values per (track slug, level idx).
 *
 * BreachLab uses the classic wargame chain-password model: on each level
 * you discover the password for the next user, and that password is also
 * what you submit on /submit to earn the level's points. So the "flag"
 * for level N is simply the secret you recovered while solving N —
 * either the chain password for level N+1, or (at the end of a track)
 * the graduation token.
 *
 * Source of truth lives in the container Dockerfiles:
 *   breachlab-ghost/Dockerfile           — `echo "ghostN:<pwd>" | chpasswd` lines
 *   breachlab-phantom/Dockerfile         — same pattern
 *   breachlab-ghost/services/level22-gatekeeper.py   — Ghost graduation flag
 *   breachlab-phantom/services/verify-graduation.sh  — Phantom graduation flag
 *
 * These mappings are mirrored here so the seed/sync scripts and the
 * submit handler agree on what counts as a correct solve. Changes to
 * container passwords MUST be reflected here and re-synced to the DB.
 */
export const GHOST_FLAGS: Record<number, string> = {
  0: "W3lc0m3T0Gh0st",
  1: "D4shIsN0tAFl4g",
  2: "H1dd3nInSh4dow",
  3: "P3rm1ss10ns_M4tt3r",
  4: "Gr3p_F1nds_Truth",
  5: "P0rts_N3v3r_L13",
  6: "3nv_L34ks_3v3ryth1ng",
  7: "D3c0d3_0r_D13",
  8: "Pr0c_T3lls_4ll",
  9: "N01s3_Fl00r",
  10: "Str1ngs_R3v34l",
  11: "Unwr4pp3d_Thr33",
  12: "K3y_N0t_P4ss",
  13: "N3tc4t_D3l1v3r",
  14: "TLS_0r_N0th1ng",
  15: "P0rt_Sc4nn3d",
  16: "D1ff_Sp0ts_1t",
  17: "Sh3ll_D3n13d",
  18: "SU1D_Fl1p",
  19: "P1N_Cr4ck3d",
  20: "Cr0n_R34ds",
  21: "G1t_H1st0ry",
  22: "Gh0st_0p3r4t1v3",
};

export const PHANTOM_FLAGS: Record<number, string> = {
  0: "R3c0n_C0mpl3t3",
  1: "SU1D_Pwn3d",
  2: "Sud0_G4m3s_W0n",
  3: "L1br4ry_P01s0n3d",
  4: "C4p_Th3_Fl4g",
  5: "F1l3_Auth0r1ty",
  6: "Cr0n_H1j4ck3d",
  7: "P0lk1t_Pwn3d",
  8: "Ptr4c3_1nj3ct3d",
  9: "K3rn3l_D4y_0wn3d",
  10: "H4rv3st_C0mpl3t3",
  11: "T0k3n_Hunt3d",
  12: "Gh0st_1nst4ll3d",
  13: "D33p_R00ts_S3t",
  14: "Sh4d0w_M0d3_0n",
  15: "Cl34n_Sl4t3_D0n3",
  16: "Tunn3l_M4st3r",
  17: "1nt3rn4l_Pwn3d",
  18: "Cr3d_Spr4y_W0rks",
  19: "Ch41n_R34ct10n_D0n3",
  20: "C0nt41n3r_D3t3ct3d",
  21: "Br34k0ut_D0n3",
  22: "L34ky_V3ss3ls",
  23: "D0ck3r_4P1_Pwn3d",
  24: "P0d_3sc4p3d",
  25: "Clust3r_0wn3d",
  26: "Cl0ud_R34ch_Pwn3d",
  27: "T00l_Sm1th3d",
  28: "H31st_C0mpl3t3",
  29: "W1r3_T4pp3d",
  30: "Cl34n_3x1t_D0n3",
  31: "Phantom_0p3r4t1v3_Gr4du4t3d",
};

export const CANONICAL_FLAGS: Record<string, Record<number, string>> = {
  ghost: GHOST_FLAGS,
  phantom: PHANTOM_FLAGS,
};
