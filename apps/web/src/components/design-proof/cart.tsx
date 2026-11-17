"use client";
import { useEffect, useState } from "react";
import Link from "../app-link";
import { loadCart, checkAddition } from "../../app/(storefront)/cart/actions";
import { saveCart, storedCart } from "../../lib/catalog/browser-cart";
import { CurrencyAmount } from "../currency-amount";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import s from "./proof.module.css";
type Lang = "en" | "ar";
const w = (lang: Lang, en: string, ar: string) => (lang === "ar" ? ar : en);
export function CartContinuation({ lang }: { lang: Lang }) {
  const [state, setState] = useState<Awaited<
      ReturnType<typeof loadCart>
    > | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true,
      sequence = 0;
    const read = () => {
      const current = ++sequence;
      void Promise.resolve()
        .then(() => storedCart())
        .then(loadCart)
        .then((data) => {
          if (active && current === sequence) {
            setState(null);
            setError("");
            setState(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active && current === sequence) {
            setState(null);
            setError(
              w(
                lang,
                "Unable to read your cart. Try again.",
                "تعذر قراءة سلتك. حاول مرة أخرى.",
              ),
            );
            setLoading(false);
          }
        });
    };
    read();
    window.addEventListener("almina-cart-change", read);
    window.addEventListener("storage", read);
    return () => {
      active = false;
      window.removeEventListener("almina-cart-change", read);
      window.removeEventListener("storage", read);
    };
  }, [lang, revision]);
  async function quantity(id: string, next: number, expected: number) {
    setPending(true);
    setError("");
    try {
      const before = storedCart();
      if ((before.find((line) => line.id === id)?.quantity ?? 0) !== expected)
        throw new Error("changed");
      if (next > expected) {
        const rejected = await checkAddition(id, next);
        if (rejected) {
          setError(rejected);
          return;
        }
        if (JSON.stringify(before) !== JSON.stringify(storedCart()))
          throw new Error("changed");
      }
      saveCart([
        ...before.filter((line) => line.id !== id),
        ...(next > 0 ? [{ id, quantity: next }] : []),
      ]);
    } catch {
      setError(
        w(
          lang,
          "Cart could not be updated. Reload and try again.",
          "تعذر تحديث السلة. أعد التحميل وحاول مرة أخرى.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className={s.cartPanel}>
      <h1>{w(lang, "Your cart", "سلتك")}</h1>
      {loading && (
        <p role="status">
          {w(lang, "Checking your cart…", "جارٍ التحقق من السلة…")}
        </p>
      )}
      <p role="alert">{error || state?.error}</p>
      {(error || state?.error) && (
        <button
          type="button"
          className={s.secondary}
          onClick={() => {
            setError("");
            setLoading(true);
            setRevision((value) => value + 1);
          }}
        >
          {w(lang, "Retry cart", "إعادة محاولة السلة")}
        </button>
      )}
      {state?.items.map((item) => (
        <div className={s.cartLine} key={item.id}>
          <div>
            <Link href={"/design-proof" + item.href}>{item.name}</Link>
            {item.variantLabel && <p className={s.meta}>{item.variantLabel}</p>}
            <p>
              {w(
                lang,
                item.available ? "Available" : "Unavailable",
                item.available ? "متوفر" : "غير متوفر",
              )}
            </p>
          </div>
          <div className={s.stepper}>
            <button
              aria-label={w(
                lang,
                `Decrease ${item.name}`,
                `تقليل ${item.name}`,
              )}
              disabled={pending}
              onClick={() =>
                void quantity(item.id, item.quantity - 1, item.quantity)
              }
            >
              <MinusIcon />
            </button>
            <output aria-live="polite">{item.quantity}</output>
            <button
              aria-label={w(
                lang,
                `Increase ${item.name}`,
                `زيادة ${item.name}`,
              )}
              disabled={pending || item.quantity >= Math.min(item.stock, 999)}
              onClick={() =>
                void quantity(item.id, item.quantity + 1, item.quantity)
              }
            >
              <PlusIcon />
            </button>
          </div>
          {item.price !== null && (
            <CurrencyAmount value={item.price} locale={lang} />
          )}
          <button
            disabled={pending}
            className={s.remove}
            onClick={() => void quantity(item.id, 0, item.quantity)}
          >
            {w(lang, "Remove", "إزالة")}
          </button>
        </div>
      ))}
      {state?.items.length === 0 && !state.error && (
        <p>{w(lang, "Your cart is empty.", "سلتك فارغة.")}</p>
      )}
      {state?.subtotalMinor !== null &&
        state?.subtotalMinor !== undefined &&
        state.items.length > 0 && (
          <p className={s.cartEstimate}>
            <span>
              {w(lang, "Merchandise estimate", "تقدير قيمة المنتجات")}
            </span>
            <strong>
              <CurrencyAmount value={state.subtotalMinor / 100} locale={lang} />
            </strong>
          </p>
        )}
      <p className={s.meta}>
        {w(
          lang,
          "Catalogue estimate only. Delivery, tax and final totals require a server checkout quote.",
          "تقدير الكتالوج فقط. التوصيل والضريبة والمبلغ النهائي تتطلب عرض سعر من الخادم.",
        )}
      </p>
      <div className={s.modeActions}>
        {!!state?.items.length && !state.error && !error && (
          <Link href="/design-proof/checkout" className={s.primary}>
            {w(lang, "Checkout availability", "توفر إتمام الطلب")}
          </Link>
        )}
        <Link href="/design-proof/products">
          {w(lang, "Continue shopping", "تابع التسوق")}
        </Link>
      </div>
    </section>
  );
}
