"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { StorefrontMenu } from "../storefront-menu";
import s from "./proof.module.css";
/** A gated diagnostic for real shared controls and portals, not the P2-03 component gallery. */
export function StyleContract({ lang }: { lang: "en" | "ar" }) {
  return (
    <section className={s.modePanel}>
      <h1>{lang === "ar" ? "فحص حدود التنسيق" : "Style boundary checks"}</h1>
      <p>
        Local diagnostic states only. No order, account or provider is
        simulated.
      </p>
      <ControlStateExamples lang={lang} />
      <div data-testid="desktop-portal">
        <StorefrontMenu
          locale={lang}
          categories={[
            { name: "Synthetic category", href: "/design-proof/products" },
          ]}
        />
      </div>
      <div data-testid="mobile-portal">
        <StorefrontMenu
          locale={lang}
          mobile
          categories={[
            { name: "Synthetic category", href: "/design-proof/products" },
          ]}
        />
      </div>
    </section>
  );
}

export function ControlStateExamples({ lang }: { lang: "en" | "ar" }) {
  const [added, setAdded] = useState(false);
  const label = (en: string, ar: string) => (lang === "ar" ? ar : en);
  return (
    <>
      {" "}
      <span data-testid="foreground-probe" className="text-primary-foreground">
        {label("Foreground alias probe", "فحص لون النص")}
      </span>
      <div className={s.modeActions}>
        <Button
          data-testid="primary-utility"
          className="bg-primary text-primary-foreground"
        >
          {label("Primary utility", "الإجراء الأساسي")}
        </Button>
        <Button
          data-testid="added-variant"
          data-added={added}
          onClick={() => setAdded(!added)}
        >
          {label("Toggle added state", "تبديل حالة الإضافة")}
        </Button>
        <Button data-testid="pending-variant" aria-busy="true" disabled>
          {label("Checking state", "حالة التحقق")}
        </Button>
        <Button data-testid="disabled-variant" disabled>
          {label("Unavailable state", "حالة عدم التوفر")}
        </Button>
        <Button data-testid="ghost-variant" variant="ghost">
          {label("Ghost action", "إجراء هادئ")}
        </Button>
        <Button data-testid="outline-variant" variant="outline">
          {label("Outline action", "إجراء بإطار")}
        </Button>
        <Button data-testid="secondary-variant" variant="secondary">
          {label("Secondary action", "إجراء ثانوي")}
        </Button>
        <Button data-testid="link-variant" variant="link">
          {label("Link action", "إجراء كرابط")}
        </Button>
        <Button variant="destructive" data-testid="destructive-variant">
          {label("Destructive sample", "عينة إجراء تحذيري")}
        </Button>
        <Button variant="outline" shape="pill" data-testid="pill-shape">
          {label("Pill shape sample", "عينة الشكل البيضاوي")}
        </Button>
        <Button variant="outline" shape="rounded" data-testid="rounded-shape">
          {label("Rounded shape sample", "عينة الزوايا المستديرة")}
        </Button>
      </div>
      <label>
        {label("Normal field", "حقل عادي")}
        <Input
          data-testid="normal-field"
          defaultValue="Synthetic normal value"
        />
      </label>
      <label>
        {label("Invalid field", "حقل غير صالح")}
        <Input
          aria-invalid="true"
          defaultValue="Synthetic invalid value"
          data-testid="invalid-variant"
        />
      </label>
    </>
  );
}
