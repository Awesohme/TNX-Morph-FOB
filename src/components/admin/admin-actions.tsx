"use client";

import { useActionState } from "react";
import { Download, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { exportDataAction, importWorkbookAction, resetTestDataAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AdminActionState = { ok: boolean; message: string; data?: unknown };

const initialState: AdminActionState = { ok: false, message: "" };

export function ImportWorkbookForm() {
  const [state, action, isPending] = useActionState(importWorkbookAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Input name="workbook" type="file" accept=".xlsx,.xls" />
      <Input name="confirmation" placeholder="Type IMPORT_MORPH_OPS" />
      <Button disabled={isPending} className="w-full">
        <FileSpreadsheet className="size-4" />
        {isPending ? "Importing..." : "Import workbook"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
      {state.data ? <Textarea readOnly value={JSON.stringify(state.data, null, 2)} /> : null}
    </form>
  );
}

export function ResetTestDataForm() {
  const [state, action, isPending] = useActionState(resetTestDataAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Input name="confirmation" placeholder="Type RESET_TEST_DATA" />
      <Button disabled={isPending} variant="destructive" className="w-full">
        <RefreshCcw className="size-4" />
        {isPending ? "Resetting..." : "Reset test data"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
    </form>
  );
}

export function ExportDataForm() {
  const [state, action, isPending] = useActionState(exportDataAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Button disabled={isPending} variant="outline" className="w-full">
        <Download className="size-4" />
        {isPending ? "Generating..." : "Generate JSON export"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
      {state.data ? <Textarea readOnly value={JSON.stringify(state.data, null, 2)} /> : null}
    </form>
  );
}
