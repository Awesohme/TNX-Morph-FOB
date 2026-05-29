"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { TemplateImportManager } from "@/components/admin/template-import-manager";
import type { ImportDatasetSummary } from "@/lib/import-config";

/**
 * Per-page import. Opens the existing TemplateImportManager scoped to a single dataset so
 * each workspace (Participants, Reviews, Ops, …) can import its own records inline instead
 * of sending operators to the central admin import page.
 */
export function ImportRecordsModal({
  datasets,
  cohorts,
  label,
}: {
  datasets: ImportDatasetSummary[];
  cohorts: Array<{ id: string; name: string; status: string }>;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Import
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={`Import ${label.toLowerCase()}`}
        description="Download the template, fill it in, then import CSV or Excel with column mapping and validation."
        widthClassName="max-w-4xl"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <TemplateImportManager datasets={datasets} cohorts={cohorts} />
        </div>
      </ModalShell>
    </>
  );
}
