"use client";
import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  MapPinIcon,
  ChevronDownIcon,
  HeartIcon,
  PlusIcon,
  MinusIcon,
  HomeIcon,
  Squares2X2Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { deliveryEmirates } from "@almina/contracts";
import Link from "../app-link";
import { type Product, type CartLine } from "../../lib/catalog/model";
import { storedCart, saveCart } from "../../lib/catalog/browser-cart";
import { useCartCount } from "../../lib/catalog/use-cart-count";
import { readSaved, savedKey, setSaved } from "../../lib/catalog/saved";
import { savedArea, saveArea, areaSchema } from "../../lib/location/browser";
import { checkAddition, loadCart } from "../../app/(storefront)/cart/actions";
import { CurrencyAmount } from "../currency-amount";
import s from "./proof.module.css";
type Lang = "en" | "ar";
const w = (lang: Lang, en: string, ar: string) => (lang === "ar" ? ar : en);
export function ProofChrome({ lang }: { lang: Lang }) {
  const path = usePathname(),
    count = useCartCount();
  const detail = /\/products\/.+/.test(path) || path === "/design-proof/stress",
    cart = path === "/design-proof/cart";
  return (
    <>
      <div className={s.notice}>
        <span>
          {w(
            lang,
            "Design proof · sample prices and availability",
            "معاينة التصميم · أسعار وتوفر تجريبيان",
          )}
        </span>
        <button
          onClick={() => {
            document.cookie = `almina_lang=${lang === "en" ? "ar" : "en"}; Path=/; SameSite=Lax`;
            window.location.reload();
          }}
          lang={lang === "en" ? "ar" : "en"}
        >
          {lang === "en" ? "العربية" : "English"}
        </button>
      </div>
      <header className={s.header}>
        <div className={s.headerRow}>
          <Link href="/design-proof" className={s.logo}>
            <Image
              src="/logo.png"
              alt="Al Mina Pharmacy"
              width={142}
              height={46}
              priority
            />
          </Link>
          <Location lang={lang} />
          <Search lang={lang} />
          <Link href="/design-proof/cart" className={s.headerCart}>
            <ShoppingBagIcon aria-hidden="true" />
            <span>
              {w(lang, "Cart", "السلة")}
              <b aria-label={w(lang, `${count} items`, `${count} منتجات`)}>
                {count}
              </b>
            </span>
          </Link>
        </div>
        <nav
          className={s.departments}
          aria-label={w(lang, "Shop navigation", "التنقل في المتجر")}
        >
          <Link href="/design-proof/products">
            {w(lang, "Shop all", "تسوق الكل")}
          </Link>
          <Link href="/design-proof/products?q=skincare">
            {w(lang, "Skincare", "العناية بالبشرة")}
          </Link>
          <Link href="/design-proof/products?q=CeraVe">CeraVe</Link>
          <Link href="/design-proof/products?q=Bioderma">Bioderma</Link>
        </nav>
      </header>
      {!detail && !cart && (
        <nav
          className={s.bottomNav}
          aria-label={w(lang, "Main navigation", "التنقل الرئيسي")}
        >
          <Link
            href="/design-proof"
            aria-current={path === "/design-proof" ? "page" : undefined}
          >
            <HomeIcon />
            {w(lang, "Home", "الرئيسية")}
          </Link>
          <Link
            href="/design-proof/products"
            aria-current={
              path === "/design-proof/products" ? "page" : undefined
            }
          >
            <Squares2X2Icon />
            {w(lang, "Shop", "تسوق")}
          </Link>
          <Link href="/design-proof/cart">
            <ShoppingBagIcon />
            {w(lang, "Cart", "السلة")} {count > 0 ? `(${count})` : ""}
          </Link>
        </nav>
      )}
    </>
  );
}
function Location({ lang }: { lang: Lang }) {
  const area = useSyncExternalStore(subscribeArea, areaSnapshot, () => ""),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className={s.location}
        onClick={() => {
          const saved = savedArea();
          const form = dialog.current?.querySelector("form");
          if (form) {
            const city = form.elements.namedItem("city") as HTMLInputElement;
            const emirate = form.elements.namedItem(
              "emirate",
            ) as HTMLSelectElement;
            city.value = saved?.city ?? "";
            emirate.value = saved?.emirate ?? "Sharjah";
          }
          setError("");
          dialog.current?.showModal();
        }}
      >
        <MapPinIcon aria-hidden="true" />
        <span>
          <small>{w(lang, "Delivery location", "موقع التوصيل")}</small>
          <strong>{area || w(lang, "Select your area", "اختر منطقتك")}</strong>
        </span>
        <ChevronDownIcon aria-hidden="true" />
      </button>
      <dialog ref={dialog} className={s.dialog}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const result = areaSchema.safeParse({
              emirate: data.get("emirate"),
              city: data.get("city"),
            });
            if (!result.success) {
              setError(
                w(lang, "Enter your city or area.", "أدخل المدينة أو المنطقة."),
              );
              return;
            }
            try {
              saveArea(result.data);
              dialog.current?.close();
            } catch {
              setError(
                w(
                  lang,
                  "Location could not be saved on this device.",
                  "تعذر حفظ الموقع على هذا الجهاز.",
                ),
              );
            }
          }}
        >
          <div className={s.sectionHead}>
            <h2>{w(lang, "Where are you shopping?", "أين تتسوق؟")}</h2>
            <button
              type="button"
              aria-label={w(lang, "Close", "إغلاق")}
              onClick={() => dialog.current?.close()}
            >
              <XMarkIcon />
            </button>
          </div>
          <p>
            {w(
              lang,
              "Save an area on this device. Delivery availability and fees are confirmed separately.",
              "احفظ منطقة على هذا الجهاز. يتم تأكيد توفر التوصيل والرسوم بشكل منفصل.",
            )}
          </p>
          <label>
            {w(lang, "Emirate", "الإمارة")}
            <select name="emirate" defaultValue="Sharjah">
              {deliveryEmirates.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            {w(lang, "City / area", "المدينة / المنطقة")}
            <input name="city" maxLength={200} required defaultValue="" />
          </label>
          <p role="alert">{error}</p>
          <button className={s.primary} type="submit">
            {w(lang, "Save area", "حفظ المنطقة")}
          </button>
        </form>
      </dialog>
    </>
  );
}
function subscribeArea(callback: () => void) {
  window.addEventListener("almina-delivery-area-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("almina-delivery-area-change", callback);
    window.removeEventListener("storage", callback);
  };
}
function areaSnapshot() {
  const area = savedArea();
  return area ? `${area.city}, ${area.emirate}` : "";
}
type Suggestion = { name: string; href: string };
function Search({ lang }: { lang: Lang }) {
  const id = useId(),
    ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(""),
    [items, setItems] = useState<Suggestion[]>([]),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [failed, setFailed] = useState(false),
    [recent, setRecent] = useState<string[]>([]);
  const trimmed = q.trim();
  const choices =
    trimmed.length >= 2
      ? items
      : !trimmed
        ? recent.map((name) => ({
            name,
            href: `/design-proof/products?q=${encodeURIComponent(name)}`,
          }))
        : [];
  function remember(value = q) {
    try {
      localStorage.setItem(
        "almina.proof-searches.v1",
        JSON.stringify(
          [value, ...recent.filter((item) => item !== value)]
            .filter(Boolean)
            .slice(0, 5),
        ),
      );
    } catch {
      /* Optional history. */
    }
    setOpen(false);
  }
  useEffect(() => {
    const ctrl = new AbortController();
    if (trimmed.length < 2) return () => ctrl.abort();
    const timer = setTimeout(() => {
      void fetch(
        "/api/search/suggest?" +
          new URLSearchParams({ q: trimmed, locale: lang }),
        { signal: ctrl.signal },
      )
        .then((r) => {
          if (!r.ok) throw new Error("Suggestion request failed");
          return r.json();
        })
        .then((data: { products?: Suggestion[]; unavailable?: boolean }) => {
          if (!ctrl.signal.aborted) {
            setFailed(Boolean(data.unavailable));
            setItems(
              (data.products ?? []).map((item) => ({
                ...item,
                href: "/design-proof" + item.href,
              })),
            );
          }
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setFailed(true);
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [trimmed, lang]);
  return (
    <div
      className={s.searchWrap}
      ref={ref}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <form
        action="/design-proof/products"
        role="search"
        className={s.search}
        onSubmit={() => remember()}
      >
        <MagnifyingGlassIcon aria-hidden="true" />
        <label className={s.sr} htmlFor={id}>
          {w(lang, "Search products", "ابحث عن المنتجات")}
        </label>
        <input
          id={id}
          name="q"
          type="search"
          maxLength={80}
          autoComplete="off"
          placeholder={w(
            lang,
            "Search products, brands and more",
            "ابحث عن المنتجات والعلامات التجارية",
          )}
          value={q}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? id + "-list" : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 ? id + "-" + active : undefined
          }
          onFocus={() => {
            setOpen(true);
            try {
              const raw: unknown = JSON.parse(
                localStorage.getItem("almina.proof-searches.v1") ?? "[]",
              );
              if (Array.isArray(raw))
                setRecent(
                  raw
                    .filter((item): item is string => typeof item === "string")
                    .slice(0, 5),
                );
            } catch {
              /* Optional history. */
            }
          }}
          onChange={(event) => {
            setQ(event.target.value);
            setItems([]);
            setFailed(false);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive(Math.min(active + 1, choices.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive(Math.max(-1, active - 1));
            }
            if (
              event.key === "Enter" &&
              open &&
              active >= 0 &&
              choices[active]
            ) {
              event.preventDefault();
              remember(choices[active].name);
              window.location.assign(choices[active].href);
            }
          }}
        />
        {q && (
          <button
            type="button"
            aria-label={w(lang, "Clear search", "مسح البحث")}
            onClick={() => {
              setQ("");
              setActive(-1);
              ref.current?.querySelector("input")?.focus();
            }}
          >
            <XMarkIcon />
          </button>
        )}
        <button type="submit" className={s.searchSubmit}>
          {w(lang, "Search", "بحث")}
        </button>
      </form>
      {open && (
        <div className={s.suggestions}>
          <p>
            {w(
              lang,
              trimmed ? "Suggestions" : "Recent searches",
              trimmed ? "اقتراحات" : "عمليات البحث الأخيرة",
            )}
          </p>
          <ul
            id={id + "-list"}
            role="listbox"
            aria-label={w(lang, "Search suggestions", "اقتراحات البحث")}
          >
            {choices.map((item, index) => (
              <li
                key={item.href}
                role="option"
                id={id + "-" + index}
                aria-selected={active === index}
              >
                <Link href={item.href} onClick={() => remember(item.name)}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          {failed && (
            <p>
              {w(
                lang,
                "Suggestions unavailable. Press Search to try results.",
                "الاقتراحات غير متاحة. اضغط بحث لعرض النتائج.",
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export function Save({ id, lang }: { id: string; lang: Lang }) {
  const [saved, setState] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    function sync() {
      setState(readSaved(localStorage.getItem(savedKey)).includes(id));
    }
    try {
      sync();
    } catch {
      /* Optional device state. */
    }
    window.addEventListener("almina-saved-change", sync);
    return () => window.removeEventListener("almina-saved-change", sync);
  }, [id]);
  return (
    <>
      <button
        className={s.save}
        aria-label={w(
          lang,
          saved ? "Remove from saved" : "Save product",
          saved ? "إزالة من المحفوظات" : "حفظ المنتج",
        )}
        aria-pressed={saved}
        onClick={() => {
          try {
            const ids = readSaved(localStorage.getItem(savedKey));
            setSaved(
              saved ? ids.filter((value) => value !== id) : [...ids, id],
            );
          } catch {
            setError(true);
          }
        }}
      >
        <HeartIcon fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      {error && (
        <span className={s.sr} role="alert">
          {w(
            lang,
            "Unable to save on this device",
            "تعذر الحفظ على هذا الجهاز",
          )}
        </span>
      )}
    </>
  );
}
export function Purchase({
  product,
  lang,
  detailed = false,
}: {
  product: Product;
  lang: Lang;
  detailed?: boolean;
}) {
  const [count, setCount] = useState(0),
    [qty, setQty] = useState(1),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const sync = () => {
      try {
        setCount(
          storedCart().find((line) => line.id === product._id)?.quantity ?? 0,
        );
      } catch {
        /* Error presented on mutation. */
      }
    };
    sync();
    window.addEventListener("almina-cart-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("almina-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [product._id]);
  async function change(next: number) {
    setPending(true);
    setMessage("");
    try {
      const before = storedCart();
      if (
        (before.find((line) => line.id === product._id)?.quantity ?? 0) !==
        count
      ) {
        setMessage(
          w(
            lang,
            "Cart changed. Please try again.",
            "تغيرت السلة. يرجى المحاولة مرة أخرى.",
          ),
        );
        return;
      }
      if (next > count) {
        const error = await checkAddition(product._id, next);
        if (error) {
          setMessage(error);
          return;
        }
        if (JSON.stringify(before) !== JSON.stringify(storedCart())) {
          setMessage(
            w(
              lang,
              "Cart changed. Please try again.",
              "تغيرت السلة. يرجى المحاولة مرة أخرى.",
            ),
          );
          return;
        }
      }
      saveCart([
        ...before.filter((line) => line.id !== product._id),
        ...(next > 0 ? [{ id: product._id, quantity: next }] : []),
      ]);
    } catch {
      setMessage(
        w(
          lang,
          "Could not update your cart. Please try again.",
          "تعذر تحديث السلة. حاول مرة أخرى.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      className={detailed ? s.purchaseDetail : s.purchase}
      aria-busy={pending}
    >
      {detailed && count === 0 && product.stock > 0 && (
        <div className={s.stepper}>
          <button
            aria-label={w(lang, "Decrease quantity", "تقليل الكمية")}
            disabled={qty <= 1}
            onClick={() => setQty(qty - 1)}
          >
            <MinusIcon />
          </button>
          <output>{qty}</output>
          <button
            aria-label={w(lang, "Increase quantity", "زيادة الكمية")}
            disabled={qty >= Math.min(999, product.stock)}
            onClick={() => setQty(qty + 1)}
          >
            <PlusIcon />
          </button>
        </div>
      )}
      {count > 0 ? (
        <div className={s.stepper}>
          <button
            disabled={pending}
            aria-label={w(
              lang,
              `Remove one ${product.name}`,
              `إزالة واحد ${product.name}`,
            )}
            onClick={() => void change(count - 1)}
          >
            <MinusIcon />
          </button>
          <output aria-live="polite">{count}</output>
          <button
            disabled={pending || count >= Math.min(999, product.stock)}
            aria-label={w(
              lang,
              `Add one ${product.name}`,
              `إضافة واحد ${product.name}`,
            )}
            onClick={() => void change(count + 1)}
          >
            <PlusIcon />
          </button>
        </div>
      ) : (
        <button
          className={s.add}
          disabled={pending || product.stock <= 0}
          aria-label={w(
            lang,
            `Add ${product.name} to cart`,
            `إضافة ${product.name} إلى السلة`,
          )}
          onClick={() => void change(detailed ? qty : 1)}
        >
          {pending ? (
            <span aria-hidden="true">…</span>
          ) : (
            <PlusIcon aria-hidden="true" />
          )}
          {detailed && (
            <span>
              {w(
                lang,
                product.stock > 0 ? "Add to cart" : "Unavailable",
                product.stock > 0 ? "أضف إلى السلة" : "غير متوفر",
              )}
            </span>
          )}
        </button>
      )}
      {message && (
        <p className={s.purchaseError} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
export function CartContinuation({ lang }: { lang: Lang }) {
  const [state, setState] = useState<Awaited<
      ReturnType<typeof loadCart>
    > | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        const lines: CartLine[] = storedCart();
        return loadCart(lines);
      })
      .then((data) => {
        if (active) setState(data);
      })
      .catch(() => {
        if (active)
          setError(
            w(
              lang,
              "Unable to read cart. Reload to retry.",
              "تعذر قراءة السلة. أعد التحميل للمحاولة.",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [lang]);
  return (
    <section className={s.cartPanel}>
      <h1>{w(lang, "Your cart", "سلتك")}</h1>
      {!state && !error && (
        <p role="status">
          {w(lang, "Checking your cart…", "جارٍ التحقق من السلة…")}
        </p>
      )}
      <p role="alert">{error || state?.error}</p>
      {state?.items.map((item) => (
        <div className={s.cartLine} key={item.id}>
          <Link href={"/design-proof" + item.href}>{item.name}</Link>
          <span>
            {w(lang, "Quantity", "الكمية")} {item.quantity}
          </span>
          {item.price !== null && (
            <CurrencyAmount value={item.price} locale={lang} />
          )}
          <span>
            {w(
              lang,
              item.available ? "Available" : "Unavailable",
              item.available ? "متوفر" : "غير متوفر",
            )}
          </span>
        </div>
      ))}
      {state?.items.length === 0 && (
        <p>{w(lang, "Your cart is empty.", "سلتك فارغة.")}</p>
      )}
      <p>
        {w(
          lang,
          "This preview stops here. Checkout, delivery fees and payments are not enabled. No order will be placed.",
          "تتوقف المعاينة هنا. إتمام الطلب ورسوم التوصيل والدفع غير مفعّلة. لن يتم إنشاء طلب.",
        )}
      </p>
      <Link className={s.primary} href="/design-proof/products">
        {w(lang, "Continue shopping", "تابع التسوق")}
      </Link>
    </section>
  );
}

export function ResponsiveFilters({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width:900px)");
    const sync = () => {
      if (ref.current) ref.current.open = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return (
    <details ref={ref}>
      <summary>
        <span>{label}</span>
        <ChevronDownIcon aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}

/** Size the clearance from the actual dock, including wrapped Arabic and large text. */
export function PurchaseDock({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current,
      root = el?.closest("[data-proof-root]") as HTMLElement | null;
    if (!el || !root) return;
    const update = () =>
      root.style.setProperty(
        "--proof-dock-clearance",
        `${el.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => {
      observer.disconnect();
      root.style.removeProperty("--proof-dock-clearance");
    };
  }, []);
  return (
    <div ref={ref} className={s.dock}>
      {children}
    </div>
  );
}

export function SampleGallery({ lang }: { lang: Lang }) {
  const [selected, setSelected] = useState(1);
  return (
    <div className={s.sampleGallery}>
      <div
        className={s.sampleMedia}
        role="img"
        aria-label={w(
          lang,
          `Synthetic image region ${selected}, no product photograph`,
          `مساحة صورة اصطناعية ${selected} دون صورة منتج`,
        )}
      >
        {w(
          lang,
          `Sample image region ${selected} — no product photo`,
          `مساحة صورة تجريبية ${selected} — دون صورة منتج`,
        )}
      </div>
      <div
        className={s.sampleThumbs}
        role="group"
        aria-label={w(
          lang,
          "Synthetic image selection",
          "اختيار صورة اصطناعية",
        )}
      >
        {[1, 2, 3].map((value) => (
          <button
            key={value}
            aria-pressed={selected === value}
            aria-label={w(
              lang,
              `Select sample image ${value}`,
              `اختر الصورة التجريبية ${value}`,
            )}
            onClick={() => setSelected(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
