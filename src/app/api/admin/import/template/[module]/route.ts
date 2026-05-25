import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getImportDataset } from "@/lib/import-config";
import { requireRequestRole } from "@/lib/request-auth";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  const auth = await requireRequestRole("admin");
  if ("error" in auth) return auth.error;

  const { module } = await context.params;
  const dataset = getImportDataset(module);
  if (!dataset) {
    return new NextResponse("Dataset not found", { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const headers = dataset.fields.map((field) => field.label);
  const examples = dataset.fields.map((field) => field.example);
  const guidance = dataset.fields.map((field) =>
    [field.required ? "Required" : "Optional", field.type, field.helpText ?? ""].filter(Boolean).join(" • "),
  );

  const filenameBase = `${dataset.key}-import-template`;

  if (format === "csv") {
    const rows = [headers, examples, guidance]
      .map((row) => row.map((value) => csvEscape(value)).join(","))
      .join("\n");

    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, examples, guidance]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}
