import React from "react";
import PolicyLayout from "@/components/legal/PolicyLayout";

const sections = [
  {
    heading: "1. Ticket Categories",
    points: [
      "Account issues: login, access, and profile-related problems.",
      "Transaction issues: payment, listing, delivery, and dispute support.",
      "Technical issues: app bugs, broken flows, and data inconsistency.",
    ],
  },
  {
    heading: "2. Required Details",
    points: [
      "Provide clear issue summary, steps to reproduce, and expected behavior.",
      "Attach relevant order IDs, post IDs, or screenshots where available.",
      "Incomplete tickets may be returned for clarification before processing.",
    ],
  },
  {
    heading: "3. Response and Resolution",
    points: [
      "Tickets are prioritized by severity, impact, and risk.",
      "Support may request additional verification to protect account security.",
      "Resolution timelines vary by issue complexity and dependency on third-party services.",
    ],
  },
  {
    heading: "4. Misuse and Abuse",
    points: [
      "Spam, abusive, or duplicate ticket flooding may result in delayed processing.",
      "False claims, manipulation attempts, or policy abuse can lead to account action.",
      "Threatening language or harassment of support staff is not tolerated.",
    ],
  },
  {
    heading: "5. Escalation",
    points: [
      "If unresolved, users may request escalation with complete ticket context.",
      "Escalation does not guarantee priority override when queue rules apply.",
      "Final outcomes are recorded in the ticket trail for audit and compliance.",
    ],
  },
];

export default function SupportTicketPolicy() {
  return (
    <PolicyLayout
      title="Support Ticket Policy"
      subtitle="How support tickets are submitted, reviewed, prioritized, and resolved."
      updatedOn="March 10, 2026"
      sections={sections}
    />
  );
}

