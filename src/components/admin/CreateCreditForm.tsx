"use client";
import { useState, useTransition } from "react";
import { createCredit } from "@/app/admin/hall-of-fame/actions";

export function CreateCreditForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  return (
    <form
      className="border border-amber/20 p-4 space-y-3 text-sm font-mono"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOkMsg(null);
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const totpCode = String(fd.get("totpCode") ?? "").trim();
        if (!/^\d{6}$/.test(totpCode)) {
          setError("TOTP must be 6 digits");
          return;
        }
        const payload = {
          totpCode,
          displayName: String(fd.get("displayName") ?? "").trim(),
          discordHandle: String(fd.get("discordHandle") ?? "").trim() || undefined,
          externalLink: String(fd.get("externalLink") ?? "").trim() || undefined,
          findingTitle: String(fd.get("findingTitle") ?? "").trim(),
          findingDescription:
            String(fd.get("findingDescription") ?? "").trim() || undefined,
          classRef: String(fd.get("classRef") ?? "").trim() || undefined,
          severity: String(fd.get("severity") ?? "medium"),
          prRef: String(fd.get("prRef") ?? "").trim() || undefined,
          userId: String(fd.get("userId") ?? "").trim() || undefined,
          securityScore: (() => {
            const v = String(fd.get("securityScore") ?? "").trim();
            return v ? parseInt(v, 10) : undefined;
          })(),
          notes: String(fd.get("notes") ?? "").trim() || undefined,
        };
        start(async () => {
          const r = await createCredit(payload);
          if (!r.ok) setError(r.error);
          else {
            setOkMsg(`Created pending credit ${r.data.id.slice(0, 8)}. Confirm row below to publish.`);
            (e.target as HTMLFormElement).reset();
          }
        });
      }}
    >
      <h3 className="text-amber text-xs uppercase tracking-wider">
        Add security credit
      </h3>

      <div className="grid md:grid-cols-2 gap-3">
        <Field name="displayName" label="Display name *" placeholder="Discord handle or real name" required />
        <Field name="discordHandle" label="Discord handle" placeholder="voxfox" />
        <Field name="findingTitle" label="Finding title *" placeholder="SUID system() euid drop on L7" required className="md:col-span-2" />
        <Field name="findingDescription" label="Description" placeholder="Short public description" className="md:col-span-2" textarea />
        <Field name="classRef" label="Class ref" placeholder="Class 13: SUID shell-out euid drop" />
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
        <Field name="prRef" label="PR ref" placeholder="phantom#32 | platform#36 | ghost#13" />
        <Field name="externalLink" label="External profile URL" placeholder="https://..." />
        <Field name="userId" label="User ID (UUID)" placeholder="optional — link credit to platform account" />
        <Field name="securityScore" label="Override score" placeholder="leave blank for severity default" type="number" />
        <Field name="notes" label="Admin notes" placeholder="internal, not public" className="md:col-span-2" textarea />
      </div>

      <div className="flex items-end gap-3 pt-2 border-t border-amber/10">
        <Field name="totpCode" label="TOTP *" placeholder="6-digit code" required className="w-40" />
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1 border border-amber/40 text-amber hover:bg-amber/10 disabled:opacity-40"
        >
          {pending ? "creating…" : "create"}
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
