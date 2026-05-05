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

> **Spoiler boundary.** This is a writeup, not a solution. It points at
> the four conceptual locks the level was built around and discusses
> what makes naive approaches fail. It does not hand you offsets,
> shellcode, or scripts — you still have to reason from first
> principles and execute the chain yourself. If that's what you came
> for, read on. If you wanted a copy-paste path, this isn't it.

## What L9 actually is

A 64-byte stack-allocated buffer in a SUID binary, copied into via
`strcpy`. The flag belongs to a different user (`flagkeeper9`) you
cannot `su` to. The SUID bit gives you a window — when *you* run the
binary, your effective UID briefly becomes `flagkeeper9` — and the
level is about exploiting `strcpy` to redirect execution while that
window is open.

The frame on entry to the vulnerable function looks like this — burn
this picture into your head, you'll need it for Lock 4:

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

How far past the start of `buffer` does the saved-RIP slot sit?
Counting is on you. GDB and a cyclic pattern get you the answer in
under five minutes; a careful read of the disassembly gets you there
in two. Either way, you need the offset — call it `K` — for the rest
of the writeup.

That sentence describes most stack-overflow CTF levels of the last
twenty years, so what makes L9 hard is not the bug. It's that **four
otherwise-easy skills have to land at the same time**. Solo, none of
the four would graduate this level past `medium`. Together they form a
conceptual lock. Operators rarely fail L9 from inexperience — they
fail from skill silos.

Those four locks, in the order you will most likely hit them:

1. **The shell trap.** Your first instinct is to drop a shellcode that
   does `execve("/bin/sh", ...)`. That instinct is wrong here, and
   the failure mode is silent. Step into this, and you'll spend hours
   debugging a clean-looking exploit that runs fine but leaves you
   exactly where you started.
2. **NUL bytes.** The vulnerable copy is `strcpy`. That single fact
   forbids most off-the-shelf payloads — every byte of your shellcode
   must be non-zero. msfvenom and most tutorial shellcodes will
   contain zeros somewhere.
3. **ASLR without an info leak.** Stack base is randomized per exec.
   You don't get a leak primitive. So how do you know where your
   shellcode lands?
4. **Tight byte budget.** The buffer + saved RBP + saved RIP slot
   constrain you. There's room for a payload, but not for a generous
   one. Compact syscall idioms are mandatory, not stylistic.

The rest of this writeup walks each lock at the conceptual level and
points at the technique class that resolves it. It does not show
you the answer.

---

## Lock 1 — the SUID shell trap

Read `man bash` and search for the word `PRIVILEGED`. Read `man execve`
and look for the section discussing `set-user-ID`. Both manpages
describe the same defensive behaviour at the start of any modern
shell: when the shell detects that **real UID and effective UID
differ**, it concludes that something accidentally invoked it through
a SUID program, and it drops effective UID back down to real UID
**before reading a single line of input**.

On L9, that's exactly your situation:

- You, the invoker, are `phantom9`. That's your real UID.
- The SUID bit on the binary raised your effective UID to
  `flagkeeper9` for the duration of execution.

If your shellcode `execve`s `/bin/sh` (or `/bin/dash`, or `/bin/bash`,
or anything that wraps them), the new shell process inherits both
UIDs, sees the mismatch, and re-aligns them — *down*. The shell now
runs as `phantom9`. The flag is owned by `flagkeeper9` mode 600. You
get nothing.

Two ways past this. **One is a syscall before exec** to align the IDs
yourself; look up which syscall and which arguments. **The other is
to skip the shell entirely** — you don't need a shell to read a file,
or to chmod one, or to copy one. Pick whichever fits inside your byte
budget.

The trap matters even if you correctly avoid it on your first try,
because it tells you something about the level's design: **the
designer expected you to run direct syscalls, not a shell**. That
nudge will save you bytes later.

---

## Lock 2 — NUL-free shellcode

`strcpy` reads until it sees a `\x00`. Every byte of your shellcode
must therefore be non-zero. Tutorial shellcodes almost always violate
this:

- `mov eax, 0x0000005a` (`SYS_chmod`) — encodes with three zero bytes.
- `mov rsi, 0x1a4` (`0o644`) — same problem.
- A string literal terminated with `\0` baked into your payload —
  obvious problem.
- Any address with a small immediate — almost guaranteed zeros.

Every one of these has a NUL-free workaround, and they're not exotic
— they're the well-trodden idioms of Vietnam-era exploit writing:

- **Stack-pivot small immediates** (push imm32, pop reg): the
  encoding of `push imm32` is six bytes when imm32 itself has no
  zeros. If your immediate naturally has zeros, find a larger
  equivalent that the kernel masks down (this is a real trick for the
  `chmod` mode argument).
- **XOR for zero**: `xor eax, eax` zeroes a register without an
  immediate. Standard.
- **Runtime string termination**: bake your path string with NO null
  terminator, then write the terminator yourself at runtime via
  `mov [reg + len], al` after `xor eax, eax`. The path lives in your
  shellcode without a zero byte; the kernel sees a properly
  terminated string when the syscall fires.
- **PC-relative addressing**: `lea rdi, [rip + label]` to point at
  data in your own payload, with no absolute address you'd have to
  bake.

In skeleton form, the idioms collected together look something like
this (generic, not the L9 payload — you fill in the actual path,
syscall numbers, and verify NUL-cleanliness yourself):

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

Replace the placeholders with values that are correct for your target
*and* survive the NUL-check. `LEN` is the length of your path string.
`<syscall-no>` and `<mode-without-zeros>` are exercises — you'll find
the syscall number in `/usr/include/asm/unistd_64.h`, and the
mode-without-zeros trick relies on the kernel masking the high bits
of the mode argument down to twelve.

Putting these together, the canonical "NUL-free chmod" shellcode is
under 70 bytes. The canonical "NUL-free open/read/write" is similar.
The point of writing it by hand is not to be clever — it's that
*every msfvenom output for this needs encoder layers that you don't
have room for*.

---

## Lock 3 — ASLR without a leak

Stack base address randomizes per execution. You will not see the
same stack pointer twice. You don't have a leak primitive in the
binary — there's no `printf("%p", ...)`, no `read(stdin)` that echoes
addresses back. Information-theoretically, how can you possibly know
where to point saved RIP?

There are two things to understand here. The first sounds like a
clean win. The second is what makes L9 actually hard.

**What's deterministic.** When the kernel `execve`s a binary, the
layout of `argv[]` and `envp[]` strings on the new stack is
deterministic given a small set of inputs. If you hold these four
constant:

- the length of `argv[0]` (the path the binary was invoked under),
- the number of argv entries,
- the total length of all argv strings combined,
- the environment (envp contents and ordering),

then the **offset** of `argv[1]` from the top of the stack VMA is the
same across two different binaries. Build a tiny "probe" binary that
prints the address of its own `argv[1]`, invoke it under the same
four conditions as the real exploit, and you learn that offset.

```c
#include <stdio.h>
int main(int argc, char **argv) {
    if (argc > 1) printf("%p\n", argv[1]);
    return 0;
}
```

**What's still random.** What the probe gives you is *the offset
within a page*, not the absolute address. Linux ASLR randomizes the
stack VMA's base address per `execve`, with roughly 24 bits of
entropy on x86_64. The bottom 12 bits — the page offset — are stable
between two execs that share the four inputs above. The middle 24
bits roll fresh every exec.

In numbers: run the probe three times in a row with identical
arguments and you'll see something like

```
0x7ffe71260e92
0x7fff7f964e92
0x7ffc29250e92
```

The trailing `e92` is constant — that's your real signal. Everything
above the third nibble from the right is rolling.

So the probe is **not** a one-shot oracle that tells you where your
payload will land. It's a per-attempt oracle inside a brute-force
loop. Run probe → use that address → run exploit → if SIGSEGV, the
middle bits rolled differently, retry with a fresh probe → repeat
until your guess collides with that exec's stack base. Hit rate per
attempt is roughly **1 in 4096** (12 stable bits over the 24 random
bits). Expected solve: thousands of attempts, minutes on one core. A
small NOP sled in your padding widens the landing zone slightly but
doesn't change the order of magnitude.

If your reflex is "I'll just disable ASLR with `setarch -R`", check
the seccomp profile first — Docker's default blocks the
`personality(ADDR_NO_RANDOMIZE)` syscall, so `setarch -R bash` exits
with `Operation not permitted`. The container is locked into
`randomize_va_space=2`. There is no shortcut here; the brute-force
loop is the path.

Two things to keep clean across iterations:

1. **Re-probe each attempt.** A probe address from one iteration is
   useless to the next — middle bits rolled. Sample fresh.
2. **Identical four conditions.** `argv[0]` length, argc, total argv
   length, envp must match between probe and exploit on the same
   iteration. The most common silent failure is forgetting that the
   probe path needs to be the same byte length as the real binary's
   path — which often forces you to symlink the probe to a name that
   matches the target's path length character-for-character. Yes,
   really.

Don't reach for `getenv()` tricks — those work for environment
variables, not argv. Don't reach for return-to-libc — you don't need
ROP gadgets when you have an executable stack and a per-attempt
oracle.

The probe technique reads as a hack the first time, but it's
fundamental: **deterministic-given-inputs collapses 24 bits of
ASLR entropy into a 12-bit brute force** — that's the senior-pwn
insight, not the false claim that ASLR vanishes.

---

## Lock 4 — the budget

You have 64 bytes of buffer, 8 bytes of saved RBP, and 8 bytes of
saved RIP slot to work with — and one extra byte you can sneak in via
how `strcpy` writes its trailing NUL. Total useful: ~80 bytes.

Inside that, you need:

- A NUL-free shellcode that does the file operation.
- Padding to bring you up to the saved-RIP slot.
- The saved-RIP slot itself, set to point into your shellcode.

If your shellcode is 90 bytes, you've already lost — there's no room
for the RIP overwrite. The discipline forced by the budget is what
sends you back to the NUL-free idioms above; you cannot afford the
sloppy 200-byte payload that "works on your laptop".

There's a subtle micro-trick on the saved-RIP write. x86_64
user-space addresses are bounded above by `0x0000_7fff_ffff_ffff` —
the top two bytes are always zero. `strcpy` will write a NUL at the
exact byte after your payload. If you size your payload so that
`strcpy`'s trailing NUL falls inside the saved-RIP slot at the right
offset, **you only need to write the low six bytes of the address
yourself, and `strcpy` writes byte 7 for you for free**. Byte 8 was
already zero on the previous frame. Net effect: full 8-byte canonical
address constructed, no NUL byte ever appearing in your written
payload.

Schematically the payload looks like this (offsets are illustrative —
substitute your real `K` from the buffer-to-RIP measurement above):

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

The NOP pad is whatever brings the end of your shellcode up to
exactly the saved-RIP boundary. The 6-byte address is the low half of
where you computed your shellcode lands. The 7th byte is `strcpy`'s
trailing NUL. The 8th byte was already zero from the previous frame's
return address.

This is the kind of detail that costs you an afternoon of debugging
"my exploit segfaults on what looks like a perfect address" if you
don't think about strcpy's terminator interaction with your byte
math.

---

## Common dead-ends

These are the failure modes operators report most often. Each is a
hint that you've solved 3 of the 4 locks but missed one.

- **Shellcode runs cleanly, file read succeeds, prints garbage.**
  You probably read the wrong path, or you read a directory, or
  you forgot the runtime string-terminator and the kernel sees
  `path/file<garbage>`.
- **Shellcode runs cleanly but the flag stays mode 600.**
  Almost always: you `execve`d a shell. Re-read Lock 1.
- **`SIGSEGV` on a beautifully-crafted RIP, attempt #1.**
  This is *expected*, not a bug. Per Lock 3, the probe gives you
  bottom-12-bit certainty and a 1/4096 hit rate against the rolling
  middle 24 bits. Your first attempt was a free draw; keep looping.
  Wrap probe-then-exploit in a retry loop and let it run. If you're
  still missing after ~50k attempts, then *that's* a bug — re-check
  the four invariants below.
- **Even the loop never lands.**
  Probe and exploit are out-of-sync on one of the four invariants.
  Most common cause: payload length differed between probe and
  exploit, or you ran them in different shell sessions, or your
  `argv[0]` lengths weren't equal. The probe technique is unforgiving
  on inputs — a one-byte mismatch shifts every offset.
- **`strcpy` truncates at offset N < your payload length.**
  A NUL byte slipped in. Common locations: a small immediate you
  thought was non-zero (check the encoding, not the value), the
  low six bytes of `argv[1]`'s address (rare; if so, change
  payload length by ±1 to shift the address), or your asm
  literal somewhere.
- **Probe address looks fine but exploit lands "near" the
  shellcode, not on it.**
  You forgot the `argv[]` layout depends on `argc` *and* total
  argv string length, not just `argv[0]` length. Match all of
  it, not just the first.

---

## What L9 teaches

Every solo skill in L9 is in any pwn-101 syllabus. NUL-free encoding
appears in *Smashing the Stack for Fun and Profit* (1996). The SUID
shell trap is in `man bash` and has been since BSD shells. The argv
address derivation is folklore in the binary-exploit community for
twenty years.

The level forces you to use all four at once, with a budget that
forbids hand-waving any of them. That is the senior pwn skill in the
abstract: **assembling well-known small techniques into one
constraint-satisfaction problem under pressure**. That's also what
real-world exploit dev looks like, and it's the reason this is a
gate level for what comes after.

If you cleared L9, you have a senior pwn skill that almost no
certificate teaches. If you're still stuck, the right next move is
not to hunt for a more clever trick — it's to go back to whichever of
the four locks you understand the worst, read the relevant manpage
or paper end-to-end, and try again.

---

## Pointers, not solutions

If you want to deepen any of the four:

- *Smashing the Stack for Fun and Profit* — Aleph One, Phrack 49.
  Outdated specifics, evergreen mental model.
- *Bypassing ASLR via deterministic stack layouts* — talks and
  blog posts on the probe-binary technique abound; search for
  "stack address derivation argv length".
- `man 2 execve` — read the rationale section about set-UID
  behaviour. Then read `man bash`, search "PRIVILEGED MODE".
- `/usr/include/asm/unistd_64.h` — the syscall table. Learn to
  read it.
- *The Shellcoder's Handbook*, ch. 4-5 — NUL-free encoding
  patterns laid out methodically. Worth the slow read.

---

*Found a better approach, an error, or want to argue about technique?
Take it to* `#writeups` *on Discord. Verbatim flag values get redacted;
nudges and class-level discussion are exactly what the channel is for.*
