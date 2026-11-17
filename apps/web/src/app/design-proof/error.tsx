"use client";
import s from "../../components/design-proof/proof.module.css";
export default function ProofError({ reset }: { reset: () => void }) {
  return (
    <section className={s.empty}>
      <h1>Unable to load this preview · تعذر تحميل المعاينة</h1>
      <p>
        The local catalogue may be unavailable. Please try again.
        <br />
        قد يكون الكتالوج المحلي غير متاح. يرجى المحاولة مرة أخرى.
      </p>
      <button className={s.primary} onClick={reset}>
        Try again · حاول مرة أخرى
      </button>
    </section>
  );
}
