"use client";
import { useProofLocale } from "../../components/design-proof/locale";
import {ProofNotice} from "../../components/design-proof/notice";
import s from "../../components/design-proof/proof.module.css";
export default function ProofError({ retry }: { retry: () => void }) {
  const ar = useProofLocale() === "ar";
  return (
    <ProofNotice kind="error" headingAs="h1" title={ar ? "تعذر تحميل المعاينة" : "Unable to load this preview"}>
      <p>
        {ar
          ? "قد يكون الكتالوج المحلي غير متاح. يرجى المحاولة مرة أخرى."
          : "The local catalogue may be unavailable. Please try again."}
      </p>
      <button className={s.primary} onClick={retry}>
        {ar ? "حاول مرة أخرى" : "Try again"}
      </button>
    </ProofNotice>
  );
}
