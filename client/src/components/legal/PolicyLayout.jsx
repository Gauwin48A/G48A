import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PolicyLayout({ title, subtitle, updatedOn, sections }) {
  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900/70 dark:to-slate-950">
      <div className="page-shell page-pad w-full max-w-[640px] pt-8 md:pt-10">
        <div className="mb-8 mhub-hero-card rounded-3xl p-6 md:p-8">
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

        <div className="page-section space-y-4">
          {sections.map((section) => (
            <Card key={section.heading} className="border-blue-100/60 dark:border-slate-700/70">
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
      </div>
    </div>
  );
}
