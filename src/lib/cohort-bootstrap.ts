import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type SeedGroupKey = "config_options" | "message_templates" | "workflow_rules" | "cohort_plan_items";

export type SeedSelection = Partial<Record<SeedGroupKey, string[]>>;

export type CohortSeedItem = {
  id: string;
  group: SeedGroupKey;
  label: string;
  description: string;
  requiredFields: string[];
};

export const cohortSeedGroupLabels: Record<SeedGroupKey, string> = {
  config_options: "Status and option defaults",
  message_templates: "Message templates",
  workflow_rules: "Workflow rules",
  cohort_plan_items: "Cohort plan weeks",
};

const defaultConfigOptions = [
  ["status", "Not Started", "Not Started", 10],
  ["status", "In Progress", "In Progress", 20],
  ["status", "Done", "Done", 30],
  ["status", "Blocked", "Blocked", 40],
  ["status", "Deferred", "Deferred", 50],
  ["risk", "Green", "Green", 10],
  ["risk", "Amber", "Amber", 20],
  ["risk", "Red", "Red", 30],
  ["yes_no", "Yes", "Yes", 10],
  ["yes_no", "No", "No", 20],
  ["mvp_status", "Not Started", "Not Started", 10],
  ["mvp_status", "In Progress", "In Progress", 20],
  ["mvp_status", "Almost Done", "Almost Done", 30],
  ["mvp_status", "Completed", "Completed", 40],
  ["demo_status", "Not Presented", "Not Presented", 10],
  ["demo_status", "Live Presented", "Live Presented", 20],
  ["demo_status", "Recorded Submitted", "Recorded Submitted", 30],
  ["demo_status", "Pending Recording", "Pending Recording", 40],
  ["review_status", "Not Reviewed", "Not Reviewed", 10],
  ["review_status", "In Review", "In Review", 20],
  ["review_status", "Feedback Sent", "Feedback Sent", 30],
  ["review_status", "Needs Resubmission", "Needs Resubmission", 40],
  ["review_status", "Closed", "Closed", 50],
  ["priority", "Low", "Low", 10],
  ["priority", "Medium", "Medium", 20],
  ["priority", "High", "High", 30],
] as const;

const defaultMessageTemplates = [
  ["participants", "Risk escalation note", "Participant has moved into a high-risk state. Confirm next touchpoint, owner, and remediation plan.", "internal_note"],
  ["reviews", "Feedback follow-up", "Review is pending learner follow-up. Confirm reviewer owner and next response date.", "internal_note"],
  ["community", "Silent learner check-in", "Learner has gone silent this week. Record outreach channel, issue summary, and next check-in date.", "internal_note"],
  ["partnerships", "Partnership follow-up", "Prepare follow-up message, expected ask, and target response date.", "internal_note"],
] as const;

const defaultWorkflowRules = [
  ["participants", "record_updated", "risk", "equals", "Red", "create_task", "Escalate participant risk", "Participant requires immediate follow-up and resolution owner.", "High"],
  ["assignment_reviews", "record_updated", "review_status", "equals", "Needs Resubmission", "create_task", "Coordinate resubmission", "Review outcome requires a learner follow-up plan.", "Medium"],
  ["weekly_ops_tasks", "record_updated", "status", "equals", "Blocked", "create_task", "Resolve blocked ops task", "Task is blocked and needs intervention before delivery risk increases.", "High"],
  ["session_readiness", "record_updated", "support_assigned", "equals", "", "create_task", "Assign session support", "Session readiness record has no support owner assigned.", "Medium"],
  ["community", "record_updated", "escalations_raised", "greater_than", "0", "create_task", "Review learner escalation", "Community report contains at least one escalation that needs follow-up.", "High"],
] as const;

const defaultCohortPlanItems = [
  ["Week 0", 0, "Onboarding", "Setup", "Orientation, expectations, tools, channels, rules", "Joined WhatsApp/Classroom; tool accounts created; intro posted", "Complete onboarding checklist", "CM verifies setup before Week 1", "Iyanu", "CMs", "90% onboarded before first session", "Low setup completion", "Friday reminder + direct support"],
  ["Week 1", 1, "Product Mindset + Problem Identification", "Teach + Activity", "What products solve; spotting real problems; problem statement basics", "3 problems + 1 selected problem", "Talk to 2-3 people about selected problem", "CM flags vague problems by Wednesday", "Olamide", "CMs", "80% submit problem statement", "Vague/too broad ideas", "Share good/bad examples early"],
  ["Week 2", 2, "Validation + Persona", "Teach + Guided Work", "User empathy, validation interviews, personas, solution framing", "Persona + validated problem statement", "Validate with 2-3 users and document feedback", "Facilitator reviews top blockers", "K", "CMs", "75% submit persona + validation notes", "Students skip user research", "Require 2-3 quotes/screenshots as evidence"],
  ["Week 3", 3, "UI/UX Foundations", "Practical Class 1", "UX vs UI, user flows, wireframes, visual rules", "User flow + rough wireframe", "Sketch 1-3 screens", "Design review queue opens", "Michael/Kome", "CMs", "70% submit wireframe", "Tool/design confusion", "Simpler examples + templates"],
  ["Week 4", 4, "Design Clinic + Iteration", "Practical Class 2", "Students present designs; facilitator reviews; improve one screen", "Improved wireframe + one polished screen", "Apply feedback and submit revised design", "Reviewer marks feedback applied", "Michael/Kome", "CMs", "70% submit improved screen", "Students do not act on feedback", "Feedback checklist + resubmission status"],
  ["Week 5", 5, "AI / No-Code MVP Build", "Practical Class 1", "PRD prompting, AI building, no-code options, deployment basics", "Working core feature or prototype link", "Ship one core feature; test with 3 people", "Technical triage queue opens", "Olamide", "Sheriff/Blessing", "60% have working core feature", "MVP build overwhelm", "Focus on one feature only"],
  ["Week 6", 6, "Build Clinic + Pitch Prep", "Practical Class 2", "Troubleshoot builds; review MVPs; prepare pitch/demo", "Improved MVP + 5-min pitch outline", "Submit final MVP link + pitch/recording", "Final eligibility review", "Olamide", "CMs", "10-20 demo-ready graduates", "Last-minute no-shows", "Recorded pitch option + deadline"],
  ["Demo Day", 7, "Showcase", "Presentation", "Live/recorded demos, panel feedback, awards, certificates", "Presentation + alumni onboarding", "Complete feedback form", "Certificate/badge issue", "Olamide", "Team", "All eligible receive cert/badge", "Poor attendance", "Send links by email + WhatsApp + reminders"],
] as const;

export const cohortSeedCatalog: Record<SeedGroupKey, CohortSeedItem[]> = {
  config_options: defaultConfigOptions.map(([category, label, value]) => ({
    id: `config:${category}:${value}`,
    group: "config_options",
    label,
    description: `${category} option`,
    requiredFields: ["category", "label", "value"],
  })),
  message_templates: defaultMessageTemplates.map(([moduleKey, title]) => ({
    id: `template:${moduleKey}:${title}`,
    group: "message_templates",
    label: title,
    description: `${moduleKey} template`,
    requiredFields: ["module", "title", "body", "channel"],
  })),
  workflow_rules: defaultWorkflowRules.map(([moduleKey, triggerEvent, fieldName, comparator, expectedValue, , taskTitle]) => ({
    id: `rule:${moduleKey}:${triggerEvent}:${fieldName}:${comparator}:${expectedValue}:${taskTitle}`,
    group: "workflow_rules",
    label: taskTitle,
    description: `${moduleKey} ${fieldName} ${comparator} ${expectedValue || "blank"}`,
    requiredFields: ["module", "trigger", "field", "comparator", "output action", "task title"],
  })),
  cohort_plan_items: defaultCohortPlanItems.map(([weekLabel, , theme]) => ({
    id: `plan:${weekLabel}`,
    group: "cohort_plan_items",
    label: weekLabel,
    description: theme,
    requiredFields: ["week label", "sort order"],
  })),
};

function keyedSet<T extends Record<string, unknown>>(rows: T[], keys: Array<keyof T>) {
  return new Set(rows.map((row) => keys.map((key) => String(row[key] ?? "")).join("\u0000")));
}

function rowKey(row: Record<string, unknown>, keys: string[]) {
  return keys.map((key) => String(row[key] ?? "")).join("\u0000");
}

function selectedSeedIds(group: SeedGroupKey, selection?: SeedSelection) {
  const selected = selection?.[group];
  return new Set(selected === undefined ? cohortSeedCatalog[group].map((item) => item.id) : selected);
}

function assertRequiredSeedValues(group: SeedGroupKey, row: Record<string, unknown>) {
  const item = cohortSeedCatalog[group].find((candidate) => candidate.id === row.seed_id);
  if (!item) throw new Error("Unknown seed item.");
  const requiredKeys: Record<SeedGroupKey, string[]> = {
    config_options: ["category", "label", "value"],
    message_templates: ["module_key", "title", "body", "channel"],
    workflow_rules: ["module_key", "trigger_event", "field_name", "comparator", "output_action", "task_title"],
    cohort_plan_items: ["week_label", "sort_order"],
  };
  const missing = requiredKeys[group].filter((key) => {
    return row[key] === "" || row[key] === null || row[key] === undefined;
  });
  if (missing.length) throw new Error(`${item.label} is missing required fields: ${missing.join(", ")}.`);
}

function withoutSeedId<T extends { seed_id: string }>(row: T) {
  const { seed_id: _seedId, ...payload } = row;
  return payload;
}

export async function seedCohortDefaults(
  supabase: AdminClient,
  cohortId: string,
  actorId: string,
  selection?: SeedSelection,
) {
  const insertedCounts: Record<SeedGroupKey, number> = {
    config_options: 0,
    message_templates: 0,
    workflow_rules: 0,
    cohort_plan_items: 0,
  };

  const [{ data: configRows }, { data: templateRows }, { data: ruleRows }, { data: planRows }] = await Promise.all([
    supabase.from("config_options").select("category, value").eq("cohort_id", cohortId),
    supabase.from("message_templates").select("module_key, title").eq("cohort_id", cohortId),
    supabase.from("workflow_rules").select("module_key, trigger_event, field_name, task_title").eq("cohort_id", cohortId),
    supabase.from("cohort_plan_items").select("week_label").eq("cohort_id", cohortId),
  ]);

  const existingConfig = keyedSet(configRows ?? [], ["category", "value"]);
  const selectedConfigIds = selectedSeedIds("config_options", selection);
  const configToInsert = defaultConfigOptions
    .map(([category, label, value, sort_order]) => ({
      seed_id: `config:${category}:${value}`,
      cohort_id: cohortId,
      category,
      label,
      value,
      sort_order,
      created_by: actorId,
      updated_by: actorId,
    }))
    .filter((row) => selectedConfigIds.has(row.seed_id))
    .filter((row) => !existingConfig.has(rowKey(row, ["category", "value"])));
  if (configToInsert.length) {
    configToInsert.forEach((row) => assertRequiredSeedValues("config_options", row));
    const { error } = await supabase.from("config_options").insert(configToInsert.map(withoutSeedId));
    if (error) throw error;
    insertedCounts.config_options = configToInsert.length;
  }

  const existingTemplates = keyedSet(templateRows ?? [], ["module_key", "title"]);
  const selectedTemplateIds = selectedSeedIds("message_templates", selection);
  const templatesToInsert = defaultMessageTemplates
    .map(([module_key, title, body, channel]) => ({
      seed_id: `template:${module_key}:${title}`,
      cohort_id: cohortId,
      module_key,
      title,
      body,
      channel,
      created_by: actorId,
      updated_by: actorId,
    }))
    .filter((row) => selectedTemplateIds.has(row.seed_id))
    .filter((row) => !existingTemplates.has(rowKey(row, ["module_key", "title"])));
  if (templatesToInsert.length) {
    templatesToInsert.forEach((row) => assertRequiredSeedValues("message_templates", row));
    const { error } = await supabase.from("message_templates").insert(templatesToInsert.map(withoutSeedId));
    if (error) throw error;
    insertedCounts.message_templates = templatesToInsert.length;
  }

  const existingRules = keyedSet(ruleRows ?? [], ["module_key", "trigger_event", "field_name", "task_title"]);
  const selectedRuleIds = selectedSeedIds("workflow_rules", selection);
  const rulesToInsert = defaultWorkflowRules
    .map(([module_key, trigger_event, field_name, comparator, expected_value, output_action, task_title, task_description, task_priority]) => ({
      seed_id: `rule:${module_key}:${trigger_event}:${field_name}:${comparator}:${expected_value}:${task_title}`,
      cohort_id: cohortId,
      module_key,
      trigger_event,
      field_name,
      comparator,
      expected_value,
      output_action,
      task_title,
      task_description,
      task_priority,
      created_by: actorId,
      updated_by: actorId,
    }))
    .filter((row) => selectedRuleIds.has(row.seed_id))
    .filter((row) => !existingRules.has(rowKey(row, ["module_key", "trigger_event", "field_name", "task_title"])));
  if (rulesToInsert.length) {
    rulesToInsert.forEach((row) => assertRequiredSeedValues("workflow_rules", row));
    const { error } = await supabase.from("workflow_rules").insert(rulesToInsert.map(withoutSeedId));
    if (error) throw error;
    insertedCounts.workflow_rules = rulesToInsert.length;
  }

  const existingPlanWeeks = keyedSet(planRows ?? [], ["week_label"]);
  const selectedPlanIds = selectedSeedIds("cohort_plan_items", selection);
  const planItemsToInsert = defaultCohortPlanItems
    .map(([week_label, sort_order, theme, session_type, live_session_focus, student_output, async_task, review_loop, owner_label, support_label, success_metric, risk, mitigation]) => ({
      seed_id: `plan:${week_label}`,
      cohort_id: cohortId,
      week_label,
      sort_order,
      theme,
      session_type,
      live_session_focus,
      student_output,
      async_task,
      review_loop,
      owner_label,
      support_label,
      success_metric,
      risk,
      mitigation,
      created_by: actorId,
      updated_by: actorId,
    }))
    .filter((row) => selectedPlanIds.has(row.seed_id))
    .filter((row) => !existingPlanWeeks.has(rowKey(row, ["week_label"])));
  if (planItemsToInsert.length) {
    planItemsToInsert.forEach((row) => assertRequiredSeedValues("cohort_plan_items", row));
    const { error } = await supabase.from("cohort_plan_items").insert(planItemsToInsert.map(withoutSeedId));
    if (error) throw error;
    insertedCounts.cohort_plan_items = planItemsToInsert.length;
  }

  return insertedCounts;
}
