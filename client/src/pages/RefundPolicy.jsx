import React, { useMemo } from "react";
import PolicyLayout from "@/components/legal/PolicyLayout";
import { useTranslation } from "react-i18next";
import { useCmsPage } from "@/hooks/useCmsPage";
import {
  normalizePolicySections,
  resolvePolicySubtitle,
  resolvePolicyTitle,
  resolvePolicyUpdatedOn,
} from "@/components/legal/policyContent";

const sections = [
  {
    heading: "1. Scope",
    points: [
      "This policy applies to eligible platform payments and subscription-related transactions.",
      "Physical product refunds are subject to seller terms, delivery status, and dispute outcomes.",
      "Digital module unlocks are treated as consumed entitlements after activation.",
    ],
  },
  {
    heading: "2. Eligible Refund Scenarios",
    points: [
      "Duplicate payment caused by verified technical error.",
      "Payment captured but service/module not provisioned within committed timeline.",
      "Canceled transaction where no service or entitlement was delivered.",
    ],
  },
  {
    heading: "3. Non-Refundable Cases",
    points: [
      "Coins/credits spent to unlock premium modules after successful access is granted.",
      "User-side mistakes such as incorrect selection where service was already delivered.",
      "Policy violations, abuse, or fraudulent attempts detected during review.",
    ],
  },
  {
    heading: "4. Refund Request Process",
    points: [
      "Open a support ticket with transaction ID, date, and issue details.",
      "Refund review may require additional verification information.",
      "Approved refunds are processed through the original payment method where possible.",
    ],
  },
  {
    heading: "5. Timeline",
    points: [
      "Initial review typically starts within 2 business days.",
      "Final decision timelines depend on payment provider and verification complexity.",
      "Bank processing can take additional days after refund approval.",
    ],
  },
];

export default function RefundPolicy() {
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("refund-policy");
  const resolvedSections = useMemo(
    () => normalizePolicySections(cmsContent, sections),
    [cmsContent],
  );
  const title = resolvePolicyTitle(cmsContent, t("refund_policy"));
  const subtitle = resolvePolicySubtitle(
    cmsContent,
    t("refund_policy_subtitle"),
  );
  const updatedOn = resolvePolicyUpdatedOn(cmsContent, "March 10, 2026");
  return (
    <div className="min-h-screen mhub-premium-page nav-clearance bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-b text-gray-900 dark:text-gray-100">
      <PolicyLayout
        title={title}
        subtitle={subtitle}
        updatedOn={updatedOn}
        sections={resolvedSections}
      />
    </div>
  );
}
