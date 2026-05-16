"use client";
export function AdminWriteupActions({ id }: { id: string }) {
  return (
    <form className="flex gap-2 items-baseline">
      <button
        type="button"
        className="text-xs px-2 py-1 border border-amber text-amber hover:bg-amber/10"
        onClick={async () => {
          await fetch(`/api/admin/writeups/${id}/approve`, { method: "POST" });
          window.location.reload();
        }}
      >
        Approve
      </button>
      <input
        type="text"
        placeholder="reject reason"
        className="text-xs bg-bg border border-border px-2 py-1 w-48"
        id={`reason-${id}`}
      />
      <button
        type="button"
        className="text-xs px-2 py-1 border border-border text-muted hover:text-text"
        onClick={async () => {
          const reason = (document.getElementById(`reason-${id}`) as HTMLInputElement)?.value;
          await fetch(`/api/admin/writeups/${id}/reject`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason }),
          });
          window.location.reload();
        }}
      >
        Reject
      </button>
    </form>
  );
}
