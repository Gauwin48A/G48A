import React from "react";
import PolicyLayout from "@/components/legal/PolicyLayout";

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
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="This policy explains how account, marketplace, support, and wallet data is collected and used."
      updatedOn="March 10, 2026"
      sections={sections}
    />
  );
}

