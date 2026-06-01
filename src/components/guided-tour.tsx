"use client";

import { useCallback, useEffect } from "react";
import { Compass } from "lucide-react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

type Role = "admin" | "facilitator" | "community_manager" | string | null | undefined;

// Steps anchor to [data-tour="..."] attributes rendered across the app shell + dashboard.
// Each step degrades gracefully — driver.js skips a step whose element isn't on the page.
const ADMIN_STEPS: DriveStep[] = [
  { popover: { title: "Welcome to Morph Ops 👋", description: "A 60-second tour of your control room. You can replay it anytime from the dashboard." } },
  { element: '[data-tour="dashboard"]', popover: { title: "Dashboard", description: "Your cohort's pulse — risk, reviews due, CM reports, and the next things worth opening." } },
  { element: '[data-tour="participants"]', popover: { title: "Participants", description: "Everyone in the cohort. Open the Attendance settings here to set the sign-in window, and see each person's attendance count." } },
  { element: '[data-tour="activities"]', popover: { title: "Reviews", description: "Weekly submissions and reviews. Use the Settings gear to open/close the public submission page and share the link." } },
  { element: '[data-tour="cohorts"]', popover: { title: "Cohorts", description: "Edit cohort details and the week plan — add, edit, or remove weeks." } },
  { element: '[data-tour="community"]', popover: { title: "Reports", description: "Track your community managers and their weekly reports." } },
  { element: '[data-tour="announcements"]', popover: { title: "Announcements", description: "Send messages to community managers and see everything that's gone out." } },
  { element: '[data-tour="settings"]', popover: { title: "Settings", description: "Team access, sync, and tools. The 'Danger zone' here lets you export a backup or reset the app fresh." } },
];

const CM_STEPS: DriveStep[] = [
  { popover: { title: "Welcome 👋", description: "A quick tour of your weekly workflow. Replay it anytime from the dashboard." } },
  { element: '[data-tour="dashboard"]', popover: { title: "Dashboard", description: "Your starting point — what needs attention in your cohort this week." } },
  { element: '[data-tour="community"]', popover: { title: "Your weekly report", description: "File your weekly report here every Friday: prompts posted, silent/stuck students, energy, concerns, and next actions." } },
  { element: '[data-tour="ops"]', popover: { title: "Ops", description: "The weekly delivery checklist for your cohort — what to send and when." } },
  { element: '[data-tour="sessions"]', popover: { title: "Sessions", description: "Session readiness and details for the week." } },
  { element: '[data-tour="resources"]', popover: { title: "Resources", description: "Templates, links, and files for your cohort." } },
  { popover: { title: "Need help?", description: "The Community Manager guide on the Community page walks through your day-to-day rhythm. You're all set!" } },
];

const SEEN_KEY = "morph-tour-seen-v1";

export function GuidedTour({ role }: { role: Role }) {
  const startTour = useCallback(() => {
    const steps = role === "community_manager" ? CM_STEPS : ADMIN_STEPS;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
    const setMore = (open: boolean) =>
      (window as Window & { __setMoreOpen?: (o: boolean) => void }).__setMoreOpen?.(open);
    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      steps,
      // On mobile the nav is a bottom bar with a "More" overflow — open it so the tour can
      // spotlight items that otherwise live inside the collapsed More menu.
      onHighlightStarted: (el) => {
        if (isMobile && el && el.closest("[data-tour]")) setMore(true);
      },
      onDestroyed: () => {
        if (isMobile) setMore(false);
        try {
          localStorage.setItem(SEEN_KEY, "1");
        } catch {
          // ignore storage failures
        }
      },
    });
    d.drive();
  }, [role]);

  // Auto-run once per browser on first dashboard visit.
  useEffect(() => {
    let seen = "1";
    try {
      seen = localStorage.getItem(SEEN_KEY) ?? "";
    } catch {
      seen = "1";
    }
    if (seen) return;
    // Defer so the nav + dashboard have painted and anchors exist.
    const t = window.setTimeout(startTour, 800);
    return () => window.clearTimeout(t);
  }, [startTour]);

  // Expose a manual replay handler on window so a lightweight button can trigger it.
  useEffect(() => {
    (window as Window & { __startMorphTour?: () => void }).__startMorphTour = startTour;
    return () => {
      delete (window as Window & { __startMorphTour?: () => void }).__startMorphTour;
    };
  }, [startTour]);

  return (
    <button
      type="button"
      onClick={startTour}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <Compass className="size-4" />
      Take a tour
    </button>
  );
}
