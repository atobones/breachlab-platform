"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      document.body.setAttribute("data-nav-open", "true");
      document.body.style.overflow = "hidden";
    } else {
      document.body.removeAttribute("data-nav-open");
      document.body.style.overflow = "";
    }
    return () => {
      document.body.removeAttribute("data-nav-open");
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className="bl-burger"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="bl-burger-tag">[</span>
        <span className="bl-burger-glyph" aria-hidden>
          {open ? "×" : "≡"}
        </span>
        <span className="bl-burger-tag">]</span>
      </button>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="bl-nav-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
