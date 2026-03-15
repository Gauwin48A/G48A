import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PolicyLayout({ title, subtitle, updatedOn, sections }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      <div className="page-shell page-pad w-full max-w-4xl pt-8 md:pt-10">
        <div className="mb-8 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
            Legal
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 md:text-base">
            {subtitle}
          </p>
          <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            Last updated: {updatedOn}
          </p>
        </div>

        <div className="page-section space-y-4">
          {sections.map((section) => (
            <Card key={section.heading} className="border-blue-100 dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg">{section.heading}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="page-section rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <p className="mb-2 font-semibold text-blue-800 dark:text-blue-200">
            Other legal pages
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/t&c"
              className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              Terms
            </Link>
            <Link
              to="/privacy-policy"
              className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              Privacy
            </Link>
            <Link
              to="/refund-policy"
              className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              Refund
            </Link>
            <Link
              to="/support-ticket-policy"
              className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              Support Tickets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
