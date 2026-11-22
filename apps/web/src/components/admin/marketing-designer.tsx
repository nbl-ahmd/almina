"use client";
import { buttonVariants } from "./ui";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
export default function MarketingDesigner({
  source,
  onChange,
  editorRef,
}: {
  source: string;
  onChange: (mjml: string) => void;
  editorRef: { current: Editor | null };
}) {
  const container = useRef<HTMLDivElement>(null),
    changed = useRef(onChange);
  const [mobilePanel, setMobilePanel] = useState<"canvas" | "controls">(
    "canvas",
  );
  useEffect(() => {
    changed.current = onChange;
  }, [onChange]);
  useEffect(() => {
    let editor: Editor | undefined,
      disposed = false,
      resize: ResizeObserver | undefined;
    void Promise.all([import("grapesjs"), import("grapesjs-mjml")])
      .then(([grapes, plugin]) => {
        if (disposed || !container.current) return;
        editor = grapes.default.init({
          container: container.current,
          height: "650px",
          width: "auto",
          cssIcons: "",
          storageManager: false,
          telemetry: false,
          noticeOnUnload: false,
          fromElement: false,
          plugins: [(instance) => plugin.default(instance, {})],
          assetManager: { upload: false },
          canvas: { scripts: [], styles: [] },
          deviceManager: {
            devices: [
              { name: "Desktop", width: "640px" },
              { name: "Mobile", width: "375px", widthMedia: "480px" },
            ],
          },
        });
        editorRef.current = editor;
        // GrapesJS owns a mutable Backbone collection; remove from a snapshot.
        for (const block of [...editor.BlockManager.getAll().models]) {
          if (/raw|navbar|font|style/i.test(String(block.id)))
            editor.BlockManager.remove(block);
        }
        editor.setComponents(source);
        resize = new ResizeObserver(() => {
          if (!editor || !container.current) return;
          const width = container.current.getBoundingClientRect().width;
          const mobile = width < 768;
          editor.Canvas.setZoom(
            mobile
              ? Math.max(25, Math.min(100, ((width - 120) / 640) * 100))
              : Math.max(50, Math.min(100, ((width - 280) / 640) * 100)),
          );
          if (mobile) editor.Canvas.setCoords(0, 0);
        });
        resize.observe(container.current);
        editor.on("update", () => {
          if (editor) changed.current(editor.getHtml());
        });
      })
      .catch(() => {
        if (container.current)
          container.current.textContent =
            "The designer could not load. Reload this page to try again.";
      });
    return () => {
      disposed = true;
      resize?.disconnect();
      editor?.destroy();
      editorRef.current = null;
    };
    // Source is a saved, server-validated document; changing templates remounts this editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      className="min-w-0 overflow-hidden rounded-lg bg-surface border border-line"
      data-mobile-panel={mobilePanel}
    >
      <div
        className="flex gap-2 bg-white p-2 md:hidden"
        role="group"
        aria-label="Designer view"
      >
        <button
          type="button"
          className={buttonVariants({ variant: mobilePanel === "canvas" ? "dark" : "outline", size: "sm" })}
          aria-pressed={mobilePanel === "canvas"}
          onClick={() => setMobilePanel("canvas")}
        >
          Canvas
        </button>
        <button
          type="button"
          className={buttonVariants({ variant: mobilePanel === "controls" ? "dark" : "outline", size: "sm" })}
          aria-pressed={mobilePanel === "controls"}
          onClick={() => setMobilePanel("controls")}
        >
          Blocks and styles
        </button>
      </div>
      <div ref={container} className="min-w-0" />
      <p className="m-0 bg-white p-3 text-xs">
        Drag sections on a wider screen. On a phone, add products or artwork
        above, then switch views to inspect the canvas and edit selected styles.
      </p>
    </div>
  );
}
