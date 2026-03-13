import React from "react";
import PolicyLayout from "@/components/legal/PolicyLayout";

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
  return (
    <PolicyLayout
      title="Terms & Conditions"
      subtitle="These terms govern access and use of marketplace, support, and premium module features."
      updatedOn="March 10, 2026"
      sections={sections}
    />
  );
}
