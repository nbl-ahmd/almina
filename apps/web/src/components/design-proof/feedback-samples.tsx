"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { ProofNotice, type NoticeKind } from "./notice";
import s from "./proof.module.css";
export function FeedbackSamples({ lang }: { lang: "en" | "ar" }) {
  const [kind, setKind] = useState<NoticeKind>("empty");
  const names: Record<NoticeKind, string> =
    lang === "ar"
      ? {
          loading: "جارٍ التحميل",
          error: "تعذر التحميل",
          empty: "لا توجد نتائج",
          success: "اكتمل الإجراء التجريبي",
        }
      : {
          loading: "Loading",
          error: "Unable to load",
          empty: "No results",
          success: "Sample action completed",
        };
  return (
    <>
      <div
        className={s.modeActions}
        role="group"
        aria-label={lang === "ar" ? "حالات تجريبية" : "Sample feedback states"}
      >
        {(["loading", "error", "empty", "success"] as const).map((value) => (
          <Button
            key={value}
            variant="outline"
            data-store-control="state-choice"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            data-testid={"feedback-" + value}
          >
            {names[value]}
          </Button>
        ))}
      </div>
      <ProofNotice kind={kind} title={names[kind]}>
        <p>
          {lang === "ar"
            ? "عرض لحالة الواجهة فقط؛ لم يتم إرسال طلب أو إنشاء طلب شراء."
            : "Interface state sample only; no request was sent and no order was created."}
        </p>
      </ProofNotice>
    </>
  );
}
