import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, List } from "lucide-react";

function slugify(text) {
  return text.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export default function PolicyLayout({ title, subtitle, updatedOn, sections }) {
  const [showToc, setShowToc] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const tocRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > window.innerHeight);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (slug) => {
    const el = document.getElementById(slug);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setShowToc(false);
  };

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900/70 dark:to-slate-950">
      <div className="page-shell page-pad w-full max-w-[640px] pt-8 md:pt-10">
        <div className="mb-6 mhub-hero-card rounded-3xl p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-200">
            Legal
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-200 md:text-base">
            {subtitle}
          </p>
          <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-300">
            Last updated: {updatedOn}
          </p>
        </div>

        {/* Table of Contents toggle */}
        <div className="mb-4" ref={tocRef}>
          <button
            onClick={() => setShowToc((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white/90 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm active:scale-97 dark:border-blue-800/60 dark:bg-slate-900/80 dark:text-blue-300"
          >
            <List className="w-4 h-4" />
            {showToc ? "Hide" : "Show"} Table of Contents
          </button>
          {showToc && (
            <nav className="mt-2 rounded-xl border border-blue-100/70 bg-white/95 p-3 shadow-md dark:border-slate-700/60 dark:bg-slate-900/90">
              <ol className="space-y-1.5">
                {sections.map((section) => (
                  <li key={section.heading}>
                    <button
                      onClick={() => scrollToSection(slugify(section.heading))}
                      className="w-full text-left rounded-lg px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      {section.heading}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>

        <div className="page-section space-y-4">
          {sections.map((section) => (
            <Card
              key={section.heading}
              id={slugify(section.heading)}
              className="border-blue-100/60 dark:border-slate-700/70 scroll-mt-20"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg">{section.heading}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="page-section rounded-2xl mhub-premium-surface p-4 text-sm">
          <p className="mb-2 font-semibold text-blue-800 dark:text-blue-200">
            Other legal pages
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/t&c"
              className="rounded-md border border-blue-200/70 bg-white/80 px-3 py-2 text-blue-700 hover:bg-blue-100 dark:border-blue-800/70 dark:bg-slate-900/70 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              Terms
            </Link>
            <Link
              to="/privacy-policy"
              className="rounded-md border border-blue-200/70 bg-white/80 px-3 py-2 text-blue-700 hover:bg-blue-100 dark:border-blue-800/70 dark:bg-slate-900/70 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              Privacy
            </Link>
            <Link
              to="/refund-policy"
              className="rounded-md border border-blue-200/70 bg-white/80 px-3 py-2 text-blue-700 hover:bg-blue-100 dark:border-blue-800/70 dark:bg-slate-900/70 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              Refund
            </Link>
            <Link
              to="/support-ticket-policy"
              className="rounded-md border border-blue-200/70 bg-white/80 px-3 py-2 text-blue-700 hover:bg-blue-100 dark:border-blue-800/70 dark:bg-slate-900/70 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              Support Tickets
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} Mhub. All rights reserved.
        </p>
      </div>

      {/* Back to top pill */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed z-40 right-4 flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 px-4 py-2.5 shadow-lg border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm active:scale-95 transition-all"
          style={{ bottom: "calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 16px)" }}
        >
          <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Top</span>
        </button>
      )}
    </div>
  );
}
