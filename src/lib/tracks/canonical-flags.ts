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
  0: "bl_phtm0_5f2a6f9c60ed3d72",
  1: "bl_phtm1_88c9a8f6cefa733e",
  2: "bl_phtm2_8aa5b04cdb337f6c",
  3: "bl_phtm3_a76028a5c2716fec",
  4: "bl_phtm4_81dfa6befd385db4",
  5: "bl_phtm5_3ce7637c1fa31cb2",
  6: "bl_phtm6_b20566aedd42c973",
  7: "bl_phtm7_937a0b0148951cae",
  8: "bl_phtm8_8290163e0cc52c71",
  9: "bl_phtm9_a7c3e0db0db67d63",
  10: "bl_phtm10_ea452c951c2048b2",
  11: "bl_phtm11_dcad1d818b255fe7",
  12: "bl_phtm12_6738ac1ce051c4ec",
  13: "bl_phtm13_72e802d2d931885a",
  14: "bl_phtm14_19bceb0570c0856d",
  15: "bl_phtm15_dff3f4f5c135d12f",
  16: "bl_phtm16_9fd69ae362fefb73",
  17: "bl_phtm17_91ec03fef953d01f",
  18: "bl_phtm18_37f237428cf2b288",
  19: "bl_phtm19_4debfc48c851c715",
  20: "bl_phtm20_4957ac088651ce71",
  21: "bl_phtm21_f5a0f8827e1d60ba",
  22: "bl_phtm22_035d10a9da7932dd",
  23: "bl_phtm23_06e8d2c570304563",
  24: "bl_phtm24_1f8fbf4ddc0ce534",
  25: "bl_phtm25_0468774901f7ad23",
  26: "bl_phtm26_23f397efae780ba7",
  27: "bl_phtm27_26e6d1e04790a7a7",
  28: "bl_phtm28_d626622c88ee83ab",
  29: "bl_phtm29_cde1043054167df9",
  30: "bl_phtm30_b880669e733288a3",
  31: "bl_phtm31_0f4bd5a804dcf7ab",
};

export const CANONICAL_FLAGS: Record<string, Record<number, string>> = {
  ghost: GHOST_FLAGS,
  phantom: PHANTOM_FLAGS,
};
