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
    heading: "1. Platform Use",
    points: [
      "By accessing this platform, you agree to use it only for lawful buying, selling, and support activities.",
      "You must provide accurate account details and keep your login credentials secure.",
      "You are responsible for all activity performed through your account.",
    ],
  },
  {
    heading: "2. Listings and Transactions",
    points: [
      "Sellers must post truthful product details, pricing, and stock information.",
      "Buyers should verify product details before payment or pickup.",
      "Any misleading, fraudulent, or prohibited listing may be removed without notice.",
    ],
  },
  {
    heading: "3. Payments, Coins, and Premium Modules",
    points: [
      "Coins/credits are used to unlock specific premium modules and are non-transferable between users.",
      "Unlocked modules remain available on the same account unless otherwise specified.",
      "Abuse of wallet, payment, or unlock flows may lead to account restriction.",
    ],
  },
  {
    heading: "4. User Conduct",
    points: [
      "Harassment, spam, impersonation, and abusive language are prohibited.",
      "Users must comply with all applicable local laws and regulations.",
      "Violation of policy may result in warning, suspension, or permanent account removal.",
    ],
  },
  {
    heading: "5. Liability and Service Availability",
    points: [
      "The platform is provided on an as-is basis and may change without prior notice.",
      "We do not guarantee uninterrupted availability of all features at all times.",
      "Our liability is limited to the maximum extent permitted by applicable law.",
    ],
  },
];

export default function TermsAndConditions() {
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("terms-and-conditions");
  const resolvedSections = useMemo(
    () => normalizePolicySections(cmsContent, sections),
    [cmsContent],
  );
  const title = resolvePolicyTitle(cmsContent, t("terms_conditions"));
  const subtitle = resolvePolicySubtitle(
    cmsContent,
    t("terms_conditions_subtitle"),
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
