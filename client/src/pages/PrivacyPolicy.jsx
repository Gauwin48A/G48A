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
    heading: "1. Data We Collect",
    points: [
      "Account information such as name, phone number, and login credentials.",
      "Profile and listing information entered by you while using the platform.",
      "Operational data like device/browser metadata and app interaction logs.",
    ],
  },
  {
    heading: "2. How We Use Data",
    points: [
      "To operate account login, marketplace workflows, support modules, and chat features.",
      "To improve product reliability, performance, and fraud detection controls.",
      "To communicate transactional updates, policy changes, and service notices.",
    ],
  },
  {
    heading: "3. Coins/Credits and Premium Access Data",
    points: [
      "Wallet balance, module unlock history, and transaction logs are stored for feature continuity.",
      "Coins/credits are linked to your account and not shared with other users.",
      "Wallet data is used only for module entitlement and account auditing.",
    ],
  },
  {
    heading: "4. Data Sharing and Disclosure",
    points: [
      "We do not sell personal data to third parties.",
      "Data may be shared with legal authorities if required by law.",
      "Limited technical partners may process data strictly for infrastructure and support services.",
    ],
  },
  {
    heading: "5. Security and Retention",
    points: [
      "We apply reasonable technical and organizational measures to protect user data.",
      "Data retention periods vary by legal requirement, security needs, and feature function.",
      "You may request account deletion or correction subject to regulatory requirements.",
    ],
  },
];

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("privacy-policy");
  const resolvedSections = useMemo(
    () => normalizePolicySections(cmsContent, sections),
    [cmsContent],
  );
  const title = resolvePolicyTitle(cmsContent, t("privacy_policy"));
  const subtitle = resolvePolicySubtitle(
    cmsContent,
    t("privacy_policy_subtitle"),
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
