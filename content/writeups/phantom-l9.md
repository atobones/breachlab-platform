---
slug: phantom-l9
track: phantom
level: 9
title: "Phantom L9 — Stack Day"
difficulty: senior
prereq_levels: [phantom-8]
estimated_time: "3-6 hours"
prerequisites:
  - C calling convention (x86_64)
  - Stack layout (saved RBP, saved RIP)
  - Linux syscall ABI
  - GDB basic usage
  - Familiarity with strcpy / null-terminator behavior
---

# Phantom L9 — Stack Day

> Writeup, not a solution. Concept-level only — no offsets,
> shellcode, or scripts. You execute the chain yourself.

## TL;DR

Classic stack overflow + four independent constraints. Any one
unsolved silently kills the exploit.

| # | Constraint | Why it bites |
|---|---|---|
| 1 | SUID shell trap | `execve("/bin/sh")` drops you back to your UID |
| 2 | NUL-free shellcode | `strcpy` truncates at `\x00` |
| 3 | ASLR, no leak | Brute-force the page |
| 4 | ~80-byte budget | No room for lazy 200-byte payloads |

Operators fail L9 from skill silos, not inexperience.

---

## The setup

- 64-byte stack buffer in a SUID binary, copied via `strcpy`.
- Flag owned by `flagkeeper9`, mode 600. You cannot `su` to that user.
- SUID bit gives you a window where your EUID is `flagkeeper9`.
- The bug: overflow `buffer` → overwrite saved RIP → execute your code while EUID is elevated.

```
high addresses
              ┌────────────────────────────┐
              │   saved RIP   (8 bytes)    │  ← overwrite this
              ├────────────────────────────┤
              │   saved RBP   (8 bytes)    │
              ├────────────────────────────┤
              │   buffer[64]  (writable)   │  ← strcpy(buffer, argv[1])
              └────────────────────────────┘
low addresses
```

**Find `K` yourself** — the offset from `buffer[0]` to saved RIP.
Cyclic pattern in GDB, or read the disassembly. You'll need it.

---

## Lock 1 — SUID shell trap

**The trap.** Your first instinct is `execve("/bin/sh")`. Don't.

- Modern shells check **EUID vs RUID**. Mismatch → drop EUID to RUID
  before reading input. `man bash` → `PRIVILEGED MODE`. `man execve` → set-UID rationale.
- On L9: your RUID = `phantom9`, EUID = `flagkeeper9`. The shell sees the mismatch and re-aligns down. Flag stays at mode 600.
- Failure is **silent** — clean exploit, runs fine, you get nothing.

**Two ways out:**

- **Align UIDs before exec.** One syscall before the shell.
- **Skip the shell.** You don't need a shell to `chmod` / `open+read+write` a file. Direct syscall.

The byte budget below tells you which path the level expects.

---

## Lock 2 — NUL-free shellcode

`strcpy` reads until `\x00`. Every byte non-zero.

**Tutorial shellcodes break this:**

- `mov eax, 0x0000005a` — 3 zero bytes
- `mov rsi, 0x1a4` — same
- baked path with `\0` terminator — obvious
- any small immediate next to an address — guaranteed zeros

**Standard NUL-free idioms** (none exotic):

- **`xor reg, reg`** for zero. No immediate.
- **`push imm32` / `pop reg`** for small immediates with zero-free encoding.
- **Runtime string termination.** Bake path with NO trailing `\0`, write the terminator at runtime via `mov [reg+len], al` after `xor eax, eax`.
- **PC-relative `lea rdi, [rip + label]`** for self-data. No absolute address baked in.
- **Mode arg trick.** Kernel masks `chmod` mode to 12 bits — pick a larger zero-free equivalent.

**Skeleton** (generic, not L9's payload — fill in path, syscall numbers, verify NUL-free yourself):

```asm
.intel_syntax noprefix
.global _start
_start:
    jmp  code
path:
    .ascii "/some/file/here"        /* no trailing \0 */
code:
    lea  rdi, [rip + path]
    xor  eax, eax
    mov  byte ptr [rdi + LEN], al   /* write the \0 at runtime */
    push <mode-without-zeros>
    pop  rsi
    push <syscall-no>
    pop  rax
    syscall
```

Canonical NUL-free `chmod` lands under 70 bytes. msfvenom needs encoder layers that don't fit your budget.

---

## Lock 3 — ASLR without a leak

Stack base randomizes per `execve`. No leak primitive in the binary. How do you point saved RIP somewhere real?

### Fact 1 — 12 bits are deterministic

`argv[1] & 0xfff` is identical on every `execve` if you hold four things constant:

- length of `argv[0]`
- argc
- total length of all argv strings
- envp (contents + ordering)

Get the constant with a probe binary, **once**:

```c
#include <stdio.h>
int main(int argc, char **argv) {
    if (argc > 1) printf("%p\n", argv[1]);
    return 0;
}
```

Across runs you'll see something like:

```
0x7ffe71260e92
0x7fff7f964e92
0x7ffc29250e92
```

The trailing `e92` is yours. Write it down.

### Fact 2 — 22 bits are fresh random

- Linux x86_64 stack ASLR: `STACK_RND_MASK = 0x3fffff` page-aligned.
- ~4 million possible pages. Bits 12-33 from `get_random_long()` per `execve`.
- **Not correlated, not predictable.** The probe doesn't predict the next exec.

### The path: brute force

- Target page range: `0x7ffc_0000_0000` to `0x7fff_ffff_f000`.
- Low 12 bits from the probe. Upper 22 bits = random guess.
- **Hit rate ≈ 1 in 4 million per attempt.**
- At ~10ms per invocation: **hours to days** on one core. Parallelize across cores — no shared state.

### Loop discipline

- **One probe, reuse.** Don't `execve` a probe per iteration.
- **Match the 4 conditions exactly.** One-byte mismatch = burnt probe. The probe path length must match the real binary's path length — symlink it if you have to.
- **NOP sled doesn't help.** Byte offset within page is exact; you're brute-forcing the page, not the offset. Few bytes for off-by-one safety, no more.

### Don't bother with

- `setarch -R` — Docker seccomp blocks `personality(ADDR_NO_RANDOMIZE)`. `randomize_va_space=2` is locked.
- `getenv()` tricks — those work for env, not argv.
- ROP — you have executable stack and a known byte offset. No gadgets needed.

---

## Lock 4 — the byte budget

~80 usable bytes: `64 (buffer) + 8 (saved RBP) + 8 (saved RIP) + 1 (strcpy NUL)`.

Inside, you need:

- NUL-free shellcode that does the file operation
- Padding up to saved-RIP slot
- 6 bytes of address (see strcpy trick below)

If your shellcode is 90 bytes, you've already lost.

### The strcpy-terminator trick

- x86_64 user addresses are bounded by `0x0000_7fff_ffff_ffff` → top 2 bytes always zero.
- Size payload so `strcpy`'s trailing `\x00` lands inside the saved-RIP slot at the right offset.
- You write **bytes 1-6** of the address.
- `strcpy` writes **byte 7** (the `\x00`) for free.
- **Byte 8** was already zero from the previous frame.
- Net: full 8-byte canonical address constructed, no NUL byte in your written payload.

### Payload shape

```
offset            0 ──────────────────────────────────► payload_len
                  ┌──────────────────┬────────┬────────┐
                  │   shellcode      │  NOP   │ addr_lo│
                  │  (NUL-free)      │  pad   │ 6 bytes│
                  └──────────────────┴────────┴────────┘
                  ▲                  ▲        ▲        ▲
                  │                  │        │        │
                  buffer[0]      offset K-N   K        K+6
                                              │        │
                                          saved RIP    │
                                          starts here  │
                                              ▲        │
                                              └─ strcpy writes \0 here,
                                                 completing byte 7
```

NOP pad brings the shellcode end to exactly the saved-RIP boundary. Miss this and you'll spend an afternoon debugging "my exploit segfaults on what looks like a perfect address".

---

## Dead-ends → which lock you missed

| Symptom | Likely cause |
|---|---|
| Shellcode runs, file read works, prints garbage | Wrong path / read a dir / forgot runtime `\0` terminator |
| Shellcode runs but flag stays mode 600 | You `execve`d a shell. Re-read Lock 1. |
| `SIGSEGV` on perfect RIP, attempt #1 | Expected — ~1/4M hit rate. Loop it. |
| Loop never lands no matter how long | Probe ≠ exploit on one of the 4 invariants. Payload length / argv length / shell env. |
| `strcpy` truncates at offset N < payload length | A NUL byte slipped in. Check encoding, not value. |
| Probe address fine, exploit lands "near" but not on shellcode | Forgot argv layout depends on **argc AND total argv length**, not just argv[0]. |

---

## Resources

- *Smashing the Stack for Fun and Profit* — Aleph One, Phrack 49. Outdated specifics, evergreen model.
- `man 2 execve` — set-UID rationale section. Then `man bash` → `PRIVILEGED MODE`.
- `/usr/include/asm/unistd_64.h` — syscall table.
- *The Shellcoder's Handbook*, ch. 4-5 — NUL-free encoding patterns.
- Search *"stack address derivation argv length"* for probe-binary writeups.

---

*Better approach, error, technique argument? Take it to* `#writeups` *on Discord. Verbatim flag values get redacted.*
