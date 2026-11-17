import type { ReactNode } from "react";
import s from "./proof.module.css";
export type NoticeKind = "loading" | "error" | "empty" | "success";
export function ProofNotice({
  kind,
  title,
  headingAs: Heading = "h3",
  children,
}: {
  kind: NoticeKind;
  title: string;
  headingAs?: "h1" | "h3";
  children: ReactNode;
}) {
  return (
    <section
      className={s.empty}
      data-store-notice={kind}
      aria-busy={kind === "loading" || undefined}
    >
      <Heading>{title}</Heading>
      <div
        aria-label={kind === "empty" ? undefined : title}
        role={
          kind === "error"
            ? "alert"
            : kind === "loading" || kind === "success"
              ? "status"
              : undefined
        }
      >
        {children}
      </div>
    </section>
  );
}
