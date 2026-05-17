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

> **Spoiler boundary.** This is a writeup, not a solution. It points
> at the four conceptual locks the level was built around and
> discusses what makes naive approaches fail. It does not hand you
> offsets, shellcode, or scripts — you still have to reason from
> first principles and execute the chain yourself.

## TL;DR

A classic stack overflow with a senior twist: **four independent
constraints all need to be solved at once**, and any one of them
silently kills the exploit.

1. SUID shell trap — `execve("/bin/sh")` drops you back to your own UID.
2. NUL-free shellcode — `strcpy` truncates at the first `\x00`.
3. ASLR without an info leak — guess the page, brute-force.
4. ~80-byte budget — no room for the lazy 200-byte payload.

Operators rarely fail L9 from inexperience. They fail from skill
silos — knowing each technique solo but never assembling all four.

---

## What L9 actually is

A 64-byte stack buffer in a SUID binary, copied into via `strcpy`.
The flag belongs to `flagkeeper9`; you cannot `su` to that user. The
SUID bit gives you a window — when *you* run the binary, your
effective UID briefly becomes `flagkeeper9` — and the level is about
exploiting `strcpy` to redirect execution while that window is open.

The frame on entry to the vulnerable function. Burn this picture
into your head, you'll need it for Lock 4:

```
high addresses
              ┌────────────────────────────┐
              │   saved RIP   (8 bytes)    │  ← we want to overwrite this
              ├────────────────────────────┤
              │   saved RBP   (8 bytes)    │
              ├────────────────────────────┤
              │   buffer[64]  (writable)   │  ← strcpy(buffer, argv[1])
              └────────────────────────────┘
low addresses
```

**Find the offset from `buffer[0]` to the saved-RIP slot yourself.**
GDB and a cyclic pattern get it in five minutes; a careful read of
the disassembly gets it in two. Call your answer `K`. You'll need it
for the rest of the writeup.

That sentence describes most stack-overflow CTF levels of the last
twenty years, so what makes L9 hard is not the bug. It's that
**four otherwise-easy skills have to land at the same time**. Solo,
none of the four would graduate this level past `medium`. Together
they form a conceptual lock.

The rest of this writeup walks each lock at the conceptual level
and points at the technique class that resolves it. It does not
show you the answer.

---

## Lock 1 — the SUID shell trap

### Why your first instinct fails

Read `man bash`, search for `PRIVILEGED`. Read `man execve`, look
for the set-user-ID section. Both describe the same defensive
behaviour at the start of any modern shell: when **real UID and
effective UID differ**, the shell concludes that something
accidentally invoked it through a SUID program and drops effective
UID back to real UID **before reading a single line of input**.

On L9:

- You are `phantom9` — that's your real UID.
- The SUID bit raised your effective UID to `flagkeeper9`.

If your shellcode `execve`s `/bin/sh` (or `dash`, or `bash`, or
anything that wraps them), the new shell inherits both UIDs, sees
the mismatch, and re-aligns them — *down*. The shell now runs as
`phantom9`. The flag is owned by `flagkeeper9` mode 600. You get
nothing. And the failure is silent: clean-looking exploit, runs
fine, leaves you exactly where you started.

### Two ways past it

- **A syscall before exec** to align the IDs yourself. Look up
  which syscall and which arguments.
- **Skip the shell entirely.** You don't need a shell to read a
  file, or to `chmod` one, or to copy one. Pick whichever fits
  your byte budget.

The trap matters even if you avoid it on the first try, because
it tells you something about the level's design: **the designer
expected direct syscalls, not a shell**. That nudge saves bytes
later.

---

## Lock 2 — NUL-free shellcode

`strcpy` reads until it sees a `\x00`. Every byte of your
shellcode must be non-zero. Tutorial shellcodes almost always
violate this:

- `mov eax, 0x0000005a` (`SYS_chmod`) — three zero bytes.
- `mov rsi, 0x1a4` (`0o644`) — same problem.
- A string literal terminated with `\0` baked into the payload.
- Any address with a small immediate — almost guaranteed zeros.

### The well-trodden idioms

These are not exotic — they're standard Vietnam-era exploit
writing:

- **`xor reg, reg` for zero.** No immediate, no zero byte.
- **Stack-pivot small immediates** (`push imm32` / `pop reg`):
  six bytes when the immediate has no zeros. If your immediate
  naturally has zeros, find a larger equivalent that the kernel
  masks down (real trick for `chmod` mode).
- **Runtime string termination.** Bake your path string with NO
  null terminator, then write the terminator at runtime via
  `mov [reg + len], al` after `xor eax, eax`. The path lives in
  your shellcode with no zero byte; the kernel sees a properly
  terminated string when the syscall fires.
- **PC-relative addressing.** `lea rdi, [rip + label]` to point
  at data in your own payload, with no absolute address baked in.

### Skeleton

Generic, not the L9 payload — fill in the real path, syscall
numbers, and verify NUL-cleanliness yourself:

```asm
.intel_syntax noprefix
.global _start
_start:
    jmp  code                       /* hop over the inline string */
path:
    .ascii "/some/file/here"        /* baked, but with NO trailing \0 */
code:
    lea  rdi, [rip + path]          /* rdi = path pointer */
    xor  eax, eax
    mov  byte ptr [rdi + LEN], al   /* write the \0 the kernel expects */
    push <mode-without-zeros>
    pop  rsi                        /* mode argument */
    push <syscall-no>
    pop  rax                        /* syscall number, NUL-free */
    syscall
    /* exit cleanly so the SUID frame returns predictably */
```

Replace placeholders with values that are correct for your target
*and* survive the NUL-check. `LEN` is your path-string length.
`<syscall-no>` is in `/usr/include/asm/unistd_64.h`. The
mode-without-zeros trick relies on the kernel masking the high
bits of the mode argument down to twelve.

Canonical "NUL-free chmod" lands under 70 bytes. Canonical
"NUL-free open/read/write" is similar. The point isn't to be
clever — it's that **every msfvenom output needs encoder layers
you don't have room for**.

---

## Lock 3 — ASLR without a leak

Stack base address randomizes per execution. You will not see the
same stack pointer twice. You don't have a leak primitive in the
binary — no `printf("%p", ...)`, no `read(stdin)` that echoes
addresses back. Information-theoretically, how can you possibly
know where to point saved RIP?

Two facts to internalize. The first looks like a clean win and
isn't. The second is what the level actually charges you.

### Fact 1 — twelve bits are deterministic

When the kernel `execve`s a binary, the layout of `argv[]` and
`envp[]` strings on the new stack is a function of a small set of
inputs. Hold these four constant:

- length of `argv[0]` (the path the binary was invoked under),
- number of argv entries,
- total length of all argv strings combined,
- environment (envp contents and ordering).

The **byte offset of `argv[1]` within its memory page** —
i.e. `argv[1] & 0xfff` — is identical on every `execve`. The
bottom twelve bits are something you can know without ever
seeing the real exploit run.

A tiny probe binary gives you those bits:

```c
#include <stdio.h>
int main(int argc, char **argv) {
    if (argc > 1) printf("%p\n", argv[1]);
    return 0;
}
```

Invoke it under the same four conditions as the real exploit
(same path-length, same argc, same total argv length, same envp),
look at the low twelve bits, and write them down. You only do
this **once**. Across runs:

```
0x7ffe71260e92
0x7fff7f964e92
0x7ffc29250e92
```

The trailing `e92` is your number. Everything above the third
nibble from the right is what's about to bite you.

### Fact 2 — twenty-two bits are fresh random

Linux x86_64 stack ASLR randomizes the stack VMA's base by 22
bits, page-aligned. The kernel uses `STACK_RND_MASK = 0x3fffff`
shifted by `PAGE_SHIFT` (see `arch/x86/include/asm/elf.h` and
`fs/binfmt_elf.c::randomize_stack_top`). That's ~4 million
possible pages where your stack — and your `argv[1]` — could
end up. Bits 12 through 33 come out of a fresh
`get_random_long()` on every `execve`. They are not correlated
to the previous run, and they are not predictable from outside.

**The probe does not tell you where your real exploit will
land.** The probe is itself an `execve` with its own independent
random page bits. Re-running it just gives you the same constant
twelve bits and uncorrelated middle bits each time. The probe is
a one-time tool for learning the deterministic part — not an
oracle for predicting the next `execve`.

### The path: brute force the page bits

Pick a plausible target page in the actual stack range —
roughly `0x7ffc_0000_0000` to `0x7fff_ffff_f000` on x86_64 with
4-level paging, exactly the 22-bit window `STACK_RND_MASK`
randomizes over. Set the bottom twelve bits to the constant the
probe gave you. Fire repeatedly.

Each attempt is an independent draw against ~2²² ≈ 4 million
pages. **Hit rate ≈ 1 in 4 million per attempt.** Plan
accordingly.

Practical notes:

- **A NOP sled doesn't meaningfully widen the landing zone.**
  Your byte offset is already exact within the page; you're
  brute-forcing the page, not the offset. Keep a few bytes for
  off-by-one safety, no more.
- **Run attempts in parallel.** Multi-core scales linearly —
  no shared state.
- **Budget hours to a couple of days of CPU time** on a single
  core (at a few tens of milliseconds per invocation). This is
  brute force by design.

If your reflex is "I'll just disable ASLR with `setarch -R`",
check the seccomp profile first — Docker's default blocks the
`personality(ADDR_NO_RANDOMIZE)` syscall, so `setarch -R bash`
exits `Operation not permitted`. The container is locked into
`randomize_va_space=2`. There is no shortcut.

### Invariants to hold across the loop

1. **One probe is enough.** Don't waste an `execve` per
   iteration on a probe that tells you nothing new.
2. **Match the four conditions exactly.** `argv[0]` length,
   argc, total argv length, envp. A one-byte mismatch shifts
   every offset. Most common silent failure: probe path length
   ≠ real binary path length — you may have to symlink the
   probe to a name that matches the target's path length
   character-for-character. Yes, really.

Don't reach for `getenv()` tricks — those work for environment
variables, not argv. Don't reach for return-to-libc — you don't
need ROP gadgets when you have an executable stack and a known
byte offset within page.

The senior-pwn insight isn't "the probe defeats ASLR". It's the
opposite: **the probe exposes which bits of ASLR are real
entropy and which are deterministic — twelve deterministic
byte-offset bits, twenty-two random page bits.** The first
twelve you keep for free; the next twenty-two you pay for in
attempts.

---

## Lock 4 — the byte budget

64 bytes of buffer + 8 bytes of saved RBP + 8 bytes of saved RIP
slot + one extra byte you can sneak in via `strcpy`'s trailing
NUL = **~80 usable bytes**. Inside that you need:

- NUL-free shellcode that does the file operation.
- Padding up to the saved-RIP slot.
- The saved-RIP slot itself, pointing into your shellcode.

If your shellcode is 90 bytes, you've already lost. The
discipline this forces is exactly what sends you back to the
NUL-free idioms above — you cannot afford the sloppy 200-byte
payload that "works on your laptop".

### The strcpy-terminator trick

x86_64 user-space addresses are bounded above by
`0x0000_7fff_ffff_ffff` — the top two bytes are always zero.
`strcpy` writes a NUL at the byte immediately after your
payload. Size your payload so that `strcpy`'s NUL falls inside
the saved-RIP slot at the right offset, and:

- You write the low **six** bytes of the address yourself.
- `strcpy` writes byte 7 (the NUL) for you for free.
- Byte 8 was already zero on the previous frame.

Net effect: full 8-byte canonical address constructed, no NUL
byte ever appearing in your written payload.

### Payload shape

(Offsets illustrative — substitute your real `K` from the
buffer-to-RIP measurement.)

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
                                                 completing byte 7 of
                                                 the saved-RIP slot
```

The NOP pad brings the end of your shellcode up to exactly the
saved-RIP boundary. The 6-byte address is the low half of where
you computed your shellcode lands. The 7th byte is `strcpy`'s
trailing NUL. The 8th was already zero.

Miss this and you spend an afternoon debugging "my exploit
segfaults on what looks like a perfect address".

---

## Common dead-ends

Each entry is a hint that you've solved 3 of the 4 locks but
missed one.

- **Shellcode runs cleanly, file read succeeds, prints garbage.**
  Wrong path, read a directory, or forgot the runtime
  string-terminator and the kernel sees `path/file<garbage>`.
- **Shellcode runs cleanly but flag stays mode 600.**
  Almost always: you `execve`d a shell. Re-read Lock 1.
- **`SIGSEGV` on a beautifully-crafted RIP, attempt #1.**
  *Expected*, not a bug. Per Lock 3, hit rate is ~1 in 4 million.
  Wrap in a retry loop, parallel across cores, grind for hours.
  If still missing after a multi-hour run at full CPU — *that*'s
  a bug. Re-check the invariants.
- **The loop never lands no matter how long it runs.**
  Probe and exploit out-of-sync on one of the four invariants.
  Most common cause: payload length differed between probe and
  exploit, or different shell sessions, or unequal `argv[0]`
  lengths. The probe technique is unforgiving on inputs.
- **`strcpy` truncates at offset N < your payload length.**
  A NUL byte slipped in. Common: a small immediate you thought
  was non-zero (check the *encoding*, not the value), low six
  bytes of `argv[1]`'s address (rare; if so, change payload
  length by ±1 to shift the address), or an asm literal.
- **Probe address looks fine but exploit lands "near" the
  shellcode, not on it.**
  You forgot the `argv[]` layout depends on `argc` *and* total
  argv string length, not just `argv[0]` length.

---

## What L9 teaches

Every solo skill in L9 is in any pwn-101 syllabus. NUL-free
encoding appears in *Smashing the Stack for Fun and Profit*
(1996). The SUID shell trap is in `man bash` and has been since
BSD shells. The argv address derivation is folklore in the
binary-exploit community for twenty years.

The level forces you to use all four at once, under a budget
that forbids hand-waving any of them. That is the senior pwn
skill in the abstract: **assembling well-known small techniques
into one constraint-satisfaction problem under pressure**. It's
what real-world exploit dev looks like, and it's why this is a
gate level for what comes after.

Cleared L9? You have a senior pwn skill almost no certificate
teaches. Still stuck? The right next move is not a more clever
trick — it's to go back to whichever of the four locks you
understand the worst, read the relevant manpage or paper
end-to-end, and try again.

---

## Pointers, not solutions

- *Smashing the Stack for Fun and Profit* — Aleph One, Phrack 49.
  Outdated specifics, evergreen mental model.
- *Bypassing ASLR via deterministic stack layouts* — talks and
  posts on the probe-binary technique. Search
  *"stack address derivation argv length"*.
- `man 2 execve` — read the rationale section about set-UID
  behaviour. Then `man bash`, search `PRIVILEGED MODE`.
- `/usr/include/asm/unistd_64.h` — the syscall table. Learn to
  read it.
- *The Shellcoder's Handbook*, ch. 4-5 — NUL-free encoding
  patterns laid out methodically.

---

*Found a better approach, an error, or want to argue about
technique? Take it to* `#writeups` *on Discord. Verbatim flag
values get redacted; nudges and class-level discussion are
exactly what the channel is for.*
