"use client";
import { useState, useTransition } from "react";
import {
  createCredit,
  lookupUserByHandle,
} from "@/app/admin/hall-of-fame/actions";

type LinkStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "linked"; userId: string; username: string }
  | { kind: "no_match" };

export function CreateCreditForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [link, setLink] = useState<LinkStatus>({ kind: "idle" });
  const [handle, setHandle] = useState("");

  async function resolveHandle(raw: string) {
    const h = raw.trim();
    if (!h) {
      setLink({ kind: "idle" });
      return;
    }
    setLink({ kind: "checking" });
    const r = await lookupUserByHandle(h);
    if (!r.ok) {
      setLink({ kind: "idle" });
      return;
    }
    if (r.match) {
      setLink({
        kind: "linked",
        userId: r.match.id,
        username: r.match.username,
      });
    } else {
      setLink({ kind: "no_match" });
    }
  }

  return (
    <form
      className="border border-amber/20 p-4 space-y-3 text-sm font-mono"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOkMsg(null);
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const payload = {
          displayName: (
            String(fd.get("displayName") ?? "").trim() || handle.trim()
          ),
          discordHandle: handle.trim() || undefined,
          externalLink: String(fd.get("externalLink") ?? "").trim() || undefined,
          findingTitle: String(fd.get("findingTitle") ?? "").trim(),
          findingDescription:
            String(fd.get("findingDescription") ?? "").trim() || undefined,
          classRef: String(fd.get("classRef") ?? "").trim() || undefined,
          severity: String(fd.get("severity") ?? "medium"),
          prRef: String(fd.get("prRef") ?? "").trim() || undefined,
          userId:
            link.kind === "linked"
              ? link.userId
              : String(fd.get("userId") ?? "").trim() || undefined,
          securityScore: (() => {
            const v = String(fd.get("securityScore") ?? "").trim();
            return v ? parseInt(v, 10) : undefined;
          })(),
          notes: String(fd.get("notes") ?? "").trim() || undefined,
        };
        if (!payload.displayName || !payload.findingTitle) {
          setError("Reporter (or display name) and finding title are required.");
          return;
        }
        start(async () => {
          const r = await createCredit(payload);
          if (!r.ok) setError(r.error);
          else {
            setOkMsg(
              `Created pending credit ${r.data.id.slice(0, 8)}. Confirm the row below to award points + publish + announce on Discord.`,
            );
            (e.target as HTMLFormElement).reset();
            setHandle("");
            setLink({ kind: "idle" });
          }
        });
      }}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-amber text-xs uppercase tracking-wider">
          Add security credit
        </h3>
        <span className="text-[10px] text-muted">
          creates a <span className="text-amber">pending</span> row — no score /
          Discord announce until you confirm below
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">
            Reporter handle *
          </label>
          <input
            name="discordHandle"
            placeholder="discord handle — e.g. voxfox"
            required
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              if (link.kind !== "idle") setLink({ kind: "idle" });
            }}
            onBlur={(e) => resolveHandle(e.currentTarget.value)}
            className="bg-black/40 border border-amber/20 px-2 py-1 text-amber placeholder:text-muted/40 focus:border-amber focus:outline-none"
          />
          <span className="text-[10px] h-3">
            {link.kind === "checking" && (
              <span className="text-muted">checking…</span>
            )}
            {link.kind === "linked" && (
              <span className="text-[#facc15]">
                ✓ linked to @{link.username} — score will attach + golden name
              </span>
            )}
            {link.kind === "no_match" && (
              <span className="text-muted">
                no matching account — credit will appear under this handle
                anonymously (auto-links if they sign up later with matching
                Discord)
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Severity</label>
          <select
            name="severity"
            defaultValue="medium"
            className="bg-black/40 border border-amber/20 px-2 py-1 text-amber"
          >
            <option value="critical">critical (+30)</option>
            <option value="high">high (+20)</option>
            <option value="medium">medium (+10)</option>
            <option value="low">low (+5)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs text-muted">Finding title *</label>
          <input
            name="findingTitle"
            placeholder="e.g. SUID system() euid drop on L7"
            required
            className="bg-black/40 border border-amber/20 px-2 py-1 text-amber placeholder:text-muted/40 focus:border-amber focus:outline-none"
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-[11px] text-muted hover:text-amber underline"
        >
          {showMore ? "− hide optional fields" : "+ more fields (description, class, PR, profile, notes)"}
        </button>
      </div>

      {showMore && (
        <div className="grid md:grid-cols-2 gap-3 border-t border-amber/10 pt-3">
          <Field
            name="displayName"
            label="Display name override"
            placeholder="defaults to reporter handle"
          />
          <Field
            name="externalLink"
            label="External profile URL"
            placeholder="https://github.com/voxfox"
          />
          <Field
            name="findingDescription"
            label="Public description"
            placeholder="One or two lines shown on /hall-of-fame"
            className="md:col-span-2"
            textarea
          />
          <Field
            name="classRef"
            label="Class ref"
            placeholder="Class 13: SUID shell-out euid drop"
          />
          <Field
            name="prRef"
            label="PR ref"
            placeholder="phantom#32 · platform#36 · ghost#13"
          />
          <Field
            name="securityScore"
            label="Override score"
            placeholder="leave blank for severity default"
            type="number"
          />
          <Field
            name="userId"
            label="User ID (UUID) — override auto-link"
            placeholder="leave blank unless the auto-link matched the wrong account"
          />
          <Field
            name="notes"
            label="Admin notes (internal)"
            placeholder="not shown on the public page"
            className="md:col-span-2"
            textarea
          />
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-amber/10">
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1 border border-amber/40 text-amber hover:bg-amber/10 disabled:opacity-40"
        >
          {pending ? "creating…" : "create pending credit"}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
        {okMsg && <span className="text-xs text-green-400">{okMsg}</span>}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  className = "",
  textarea,
  type = "text",
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  textarea?: boolean;
  type?: string;
}) {
  const sharedClass =
    "bg-black/40 border border-amber/20 px-2 py-1 text-amber placeholder:text-muted/40 focus:border-amber focus:outline-none";
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs text-muted">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          placeholder={placeholder}
          required={required}
          rows={2}
          className={sharedClass}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          required={required}
          className={sharedClass}
        />
      )}
    </label>
  );
}
