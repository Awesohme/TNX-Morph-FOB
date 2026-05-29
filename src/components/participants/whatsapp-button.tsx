"use client";

import { MessageCircle } from "lucide-react";

/**
 * Opens WhatsApp (wa.me) with a pre-filled outreach message. We can't detect whether a
 * number is WhatsApp-enabled, so the button always shows; WhatsApp handles non-WA numbers.
 */
export function WhatsAppButton({
  phone,
  participantName,
  senderName,
  cohortName,
  variant = "icon",
}: {
  phone: string;
  participantName: string;
  senderName: string;
  cohortName: string;
  variant?: "icon" | "full";
}) {
  // Normalise to digits; default Nigeria country code (234) for local 0-prefixed numbers.
  const digits = phone.replace(/[^\d]/g, "");
  const normalised = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  const firstName = participantName.trim().split(/\s+/)[0] || "there";
  const message = `Hello ${firstName}, I am ${senderName} from Morph by TNX ${cohortName}, I wanted to ask if `;
  const href = `https://wa.me/${normalised}?text=${encodeURIComponent(message)}`;

  if (variant === "full") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        <MessageCircle className="size-4" />
        WhatsApp
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Message ${firstName} on WhatsApp`}
      className="inline-grid size-7 place-items-center rounded-full text-emerald-600 transition hover:bg-emerald-50"
    >
      <MessageCircle className="size-4" />
    </a>
  );
}
