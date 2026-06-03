"use client";

import { useCallback, useEffect } from "react";
import { Compass } from "lucide-react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

type Role = "admin" | "facilitator" | "community_manager" | string | null | undefined;
const SEEN_KEY = "morph-tour-seen-v1";
const TOUR_SEEN_EVENT = "morph-tour-seen";
const HIDDEN_MOBILE_SELECTORS = new Set([
  '[data-tour-mobile="participants"]',
  '[data-tour-mobile="cohorts"]',
  '[data-tour-mobile="community"]',
  '[data-tour-mobile="announcements"]',
  '[data-tour-mobile="resources"]',
  '[data-tour-mobile="alumni"]',
  '[data-tour-mobile="settings"]',
  '[data-tour-mobile="ops"]',
  '[data-tour-mobile="sessions"]',
]);

function staticStep(
  selector: string,
  title: string,
  description: string,
): DriveStep {
  return { element: selector, popover: { title, description } };
}

// Steps anchor to [data-tour="..."] attributes rendered across the app shell + dashboard.
// Each step degrades gracefully — driver.js skips a step whose element isn't on the page.
const DESKTOP_ADMIN_STEPS: DriveStep[] = [
  { popover: { title: "Welcome to Morph Ops 👋", description: "A 60-second tour of your control room. You can replay it anytime from the dashboard." } },
  { element: '[data-tour="dashboard"]', popover: { title: "Dashboard", description: "Your cohort's pulse — risk, activities due, CM reports, and the next things worth opening." } },
  { element: '[data-tour="participants"]', popover: { title: "Participants", description: "Everyone in the cohort. Open the Attendance settings here to set the sign-in window, and see each person's attendance count." } },
  { element: '[data-tour="activities"]', popover: { title: "Reviews", description: "Weekly submissions and review tracking. Use the Settings gear to open or close the public submission page and share the link." } },
  { element: '[data-tour="cohorts"]', popover: { title: "Cohorts", description: "Edit cohort details and the week plan — add, edit, or remove weeks." } },
  { element: '[data-tour="community"]', popover: { title: "Reports", description: "Track your community managers and their weekly reports." } },
  { element: '[data-tour="announcements"]', popover: { title: "Announcements", description: "Send messages to community managers and see everything that's gone out." } },
  { element: '[data-tour="settings"]', popover: { title: "Settings", description: "Team access, sync, and tools. The 'Danger zone' here lets you export a backup or reset the app fresh." } },
];

const MOBILE_ADMIN_STEPS: DriveStep[] = [
  { popover: { title: "Welcome to Morph Ops 👋", description: "A quick mobile walk-through of your control room." } },
  staticStep('[data-tour-mobile="dashboard"]', "Dashboard", "Your starting point for cohort pulse, risk, and what needs attention next."),
  staticStep('[data-tour-mobile="activities"]', "Reviews", "This is the fast route to weekly submissions and review tracking."),
  staticStep('[data-tour-mobile="more"]', "More", "The rest of the workspace lives here on mobile. We’ll open it and keep it open for the next steps."),
  staticStep('[data-tour-mobile="participants"]', "Participants", "See attendance, risk, and participant progress here."),
  staticStep('[data-tour-mobile="cohorts"]', "Cohorts", "Open cohort details, team assignments, and the week plan here."),
  staticStep('[data-tour-mobile="community"]', "Reports", "Track weekly CM reports and follow-ups here."),
  staticStep('[data-tour-mobile="announcements"]', "Announcements", "Broadcast updates to the CM team from here."),
  staticStep('[data-tour-mobile="resources"]', "Resources", "Templates, links, and cohort files stay here."),
  staticStep('[data-tour-mobile="alumni"]', "Alumni", "Manage graduates and alumni follow-up here."),
  staticStep('[data-tour-mobile="settings"]', "Settings", "Team access, sync, and operational tools live here."),
];

const DESKTOP_CM_STEPS: DriveStep[] = [
  { popover: { title: "Welcome 👋", description: "A quick tour of your weekly workflow. Replay it anytime from the dashboard." } },
  { element: '[data-tour="dashboard"]', popover: { title: "Dashboard", description: "Your starting point — what needs attention in your cohort this week." } },
  { element: '[data-tour="community"]', popover: { title: "Your weekly report", description: "File your weekly report here every Friday: prompts posted, silent/stuck students, energy, concerns, and next actions." } },
  { element: '[data-tour="ops"]', popover: { title: "Ops", description: "The weekly delivery checklist for your cohort — what to send and when." } },
  { element: '[data-tour="sessions"]', popover: { title: "Sessions", description: "Session readiness and details for the week." } },
  { element: '[data-tour="resources"]', popover: { title: "Resources", description: "Templates, links, and files for your cohort." } },
  { popover: { title: "Need help?", description: "The Community Manager guide on the Community page walks through your day-to-day rhythm. You're all set!" } },
];

const MOBILE_CM_STEPS: DriveStep[] = [
  { popover: { title: "Welcome 👋", description: "A quick mobile walk-through of your weekly workflow." } },
  staticStep('[data-tour-mobile="dashboard"]', "Dashboard", "Your starting point for the week: what needs attention right now."),
  staticStep('[data-tour-mobile="tasks"]', "My Tasks", "Stay on top of your own follow-ups here."),
  staticStep('[data-tour-mobile="activities"]', "Reviews", "Weekly submissions and review tracking live here."),
  staticStep('[data-tour-mobile="notifications"]', "Alerts", "Due-task reminders and nudges show up here."),
  staticStep('[data-tour-mobile="more"]', "More", "A few more pages are tucked into this menu on mobile. We’ll keep it open for the next steps."),
  staticStep('[data-tour-mobile="community"]', "Reports", "Use this to file and review your weekly report."),
  staticStep('[data-tour-mobile="ops"]', "Ops", "Weekly delivery tasks and execution checkpoints live here."),
  staticStep('[data-tour-mobile="sessions"]', "Sessions", "Session readiness and session details live here."),
  staticStep('[data-tour-mobile="resources"]', "Resources", "Templates, links, and shared files stay here."),
  staticStep('[data-tour-mobile="alumni"]', "Alumni", "Graduation follow-up and alumni records stay here."),
  staticStep('[data-tour-mobile="settings"]', "Settings", "Use this for your own reminder and notification preferences."),
];

export function GuidedTour({ role }: { role: Role }) {
  const startTour = useCallback(() => {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
    const steps = role === "community_manager"
      ? isMobile
        ? MOBILE_CM_STEPS
        : DESKTOP_CM_STEPS
      : isMobile
        ? MOBILE_ADMIN_STEPS
        : DESKTOP_ADMIN_STEPS;
    const setMore = (open: boolean) =>
      (window as Window & { __setMoreOpen?: (o: boolean) => void }).__setMoreOpen?.(open);
    const resolveStepElement = (selector: string) => {
      if (!isMobile) return document.querySelector(selector) ?? document.body;
      setMore(selector === '[data-tour-mobile="more"]' || HIDDEN_MOBILE_SELECTORS.has(selector));
      return document.querySelector(selector) ?? document.body;
    };
    const resolvedSteps = steps.map((step) =>
      typeof step.element === "string"
        ? { ...step, element: () => resolveStepElement(step.element as string) }
        : step,
    );

    function markTourSeen() {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore storage failures
      }
      window.dispatchEvent(new Event(TOUR_SEEN_EVENT));
    }

    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      steps: resolvedSteps,
      onDestroyed: () => {
        if (isMobile) setMore(false);
        markTourSeen();
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
