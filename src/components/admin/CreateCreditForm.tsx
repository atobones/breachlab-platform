"use client";
import { useRef, useState, useTransition } from "react";
import {
  createCredit,
  lookupUserByHandle,
  importCreditPreview,
} from "@/app/admin/hall-of-fame/actions";

type LinkStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "linked"; userId: string; username: string }
  | { kind: "no_match" };

export function CreateCreditForm() {
  const [pending, start] = useTransition();
  const [importPending, startImport] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [link, setLink] = useState<LinkStatus>({ kind: "idle" });
  const [handle, setHandle] = useState("");
  const [importRef, setImportRef] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [severity, setSeverity] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classRef, setClassRef] = useState("");
  const [prRef, setPrRef] = useState("");

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

  function doImport() {
    const ref = importRef.trim();
    if (!ref) {
      setImportMsg("Paste a PR ref like phantom#35 or a github.com/.../pull/N URL.");
      return;
    }
    setImportMsg(null);
    setError(null);
    startImport(async () => {
      const r = await importCreditPreview(ref);
      if (!r.ok) {
        setImportMsg(r.error);
        return;
      }
      setTitle(r.data.findingTitle);
      setPrRef(r.data.prRef);
      if (r.data.classRef) setClassRef(r.data.classRef);
      if (r.data.findingDescription) setDescription(r.data.findingDescription);
      if (r.data.severity) setSeverity(r.data.severity);
      if (r.data.reporterHandle) {
        setHandle(r.data.reporterHandle);
        resolveHandle(r.data.reporterHandle);
      }
      // Expand "more fields" so admin sees description / class / PR
      // autopopulated (otherwise they're hidden).
      setShowMore(true);
      setImportMsg(
        r.data.reporterHandle
          ? `Pulled title + reporter (@${r.data.reporterHandle}) from ${r.data.prRef}. Review and submit.`
          : `Pulled title from ${r.data.prRef}. No reporter line found — fill the handle manually.`,
      );
    });
  }

  return (
    <form
      ref={formRef}
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
          findingTitle: title.trim(),
          findingDescription: description.trim() || undefined,
          classRef: classRef.trim() || undefined,
          severity,
          prRef: prRef.trim() || undefined,
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
            formRef.current?.reset();
            setHandle("");
            setLink({ kind: "idle" });
            setTitle("");
            setDescription("");
            setClassRef("");
            setPrRef("");
            setSeverity("medium");
            setImportRef("");
            setImportMsg(null);
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

      <div className="border border-[#facc15]/30 bg-[#facc15]/5 p-2 space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[#facc15] uppercase tracking-wider whitespace-nowrap">
            Import from PR
          </label>
          <input
            type="text"
            value={importRef}
            onChange={(e) => setImportRef(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                doImport();
              }
            }}
            placeholder="phantom#35 · platform#36 · ghost#13 · or full github.com/.../pull/N URL"
            className="flex-1 bg-black/40 border border-[#facc15]/30 px-2 py-1 text-[#facc15] placeholder:text-muted/40 focus:border-[#facc15] focus:outline-none text-xs"
          />
          <button
            type="button"
            onClick={doImport}
            disabled={importPending}
            className="px-3 py-1 border border-[#facc15]/50 text-[#facc15] hover:bg-[#facc15]/10 disabled:opacity-40 text-xs"
          >
            {importPending ? "importing…" : "import"}
          </button>
        </div>
        <p className="text-[10px] text-muted">
          Pulls the PR title, finds the <code>Reported-by: @handle</code> /{" "}
          <code>Credit: @handle</code> line in the body, infers Class NN
          reference and severity label. Auto-populates the fields below.
        </p>
        {importMsg && (
          <p
            className={
              importMsg.startsWith("Pulled")
                ? "text-[10px] text-green-400"
                : "text-[10px] text-red-400"
            }
          >
            {importMsg}
          </p>
        )}
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
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-muted">Public description</span>
            <textarea
              name="findingDescription"
              placeholder="One or two lines shown on /hall-of-fame"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/40 border border-amber/20 px-2 py-1 text-amber placeholder:text-muted/40 focus:border-amber focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Class ref</span>
            <input
              name="classRef"
              placeholder="Class 13: SUID shell-out euid drop"
              value={classRef}
              onChange={(e) => setClassRef(e.target.value)}
              className="bg-black/40 border border-amber/20 px-2 py-1 text-amber placeholder:text-muted/40 focus:border-amber focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">PR ref</span>
            <input
              name="prRef"
              placeholder="phantom#32 · platform#36 · ghost#13"
              value={prRef}
              onChange={(e) => setPrRef(e.target.value)}
              className="bg-black/40 border border-amber/20 px-2 py-1 text-amber placeholder:text-muted/40 focus:border-amber focus:outline-none"
            />
          </label>
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
