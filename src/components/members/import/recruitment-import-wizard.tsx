"use client";

import { useState } from "react";

import {
  analyzeRecruitmentImport,
  commitRecruitmentImport,
} from "@/actions/members";
import { ColumnMappingStep } from "@/components/members/import/column-mapping-step";
import { ImportPreviewTable } from "@/components/members/import/import-preview-table";
import { RecruitmentImportSummary } from "@/components/members/import/import-summary";
import type { RecruitmentUpload } from "@/components/members/import/import-upload-step";
import { ImportUploadStep } from "@/components/members/import/import-upload-step";
import type { UniversityInfoOptions } from "@/lib/integrations/topwr";
import type { ColumnMapping } from "@/lib/member-import/columns";
import type {
  RecruitmentAnalysis,
  RecruitmentAnalysisResult,
  RecruitmentImportRowResult,
} from "@/lib/member-import/recruitment";
import type { ImportSummary } from "@/lib/member-import/summary";
import type { RecruitmentImportRowInput } from "@/lib/schemas/member-import";
import { cn } from "@/lib/utils";

type WizardState =
  | { step: "upload" }
  | {
      step: "mapping";
      upload: RecruitmentUpload;
      analysis: RecruitmentAnalysis;
    }
  | {
      step: "preview";
      upload: RecruitmentUpload;
      analysis: RecruitmentAnalysis;
    }
  | { step: "summary"; summary: ImportSummary<RecruitmentImportRowResult> };

const steps = [
  { key: "upload", label: "Plik" },
  { key: "mapping", label: "Mapowanie kolumn" },
  { key: "preview", label: "Podgląd i korekta" },
  { key: "summary", label: "Podsumowanie" },
] as const;

/** Stateless on the server: the file stays in the browser and is re-sent when the mapping changes. */
async function analyze(
  file: File,
  mapping?: ColumnMapping,
): Promise<RecruitmentAnalysisResult> {
  const formData = new FormData();
  formData.set("file", file);
  if (mapping !== undefined) {
    formData.set("mapping", JSON.stringify(mapping));
  }
  return analyzeRecruitmentImport(formData);
}

export function RecruitmentImportWizard({
  sections,
  universityInfo,
  defaultJoinedAt,
}: {
  sections: { id: string; name: string }[];
  universityInfo: UniversityInfoOptions;
  defaultJoinedAt: string;
}) {
  const [state, setState] = useState<WizardState>({ step: "upload" });
  const [uploadDefaults, setUploadDefaults] = useState({
    edition: "",
    joinedAt: defaultJoinedAt,
  });

  async function onUpload(upload: RecruitmentUpload): Promise<string | null> {
    const result = await analyze(upload.file);
    if (!result.ok) {
      return result.error;
    }
    setUploadDefaults({ edition: upload.edition, joinedAt: upload.joinedAt });
    setState({ step: "mapping", upload, analysis: result.analysis });
    return null;
  }

  async function onMappingConfirmed(
    upload: RecruitmentUpload,
    analysis: RecruitmentAnalysis,
    mapping: ColumnMapping,
  ): Promise<string | null> {
    if (sameMapping(mapping, analysis.mapping) && analysis.rows.length > 0) {
      setState({ step: "preview", upload, analysis });
      return null;
    }
    const result = await analyze(upload.file, mapping);
    if (!result.ok) {
      return result.error;
    }
    setState({
      step: result.analysis.missingFields.length > 0 ? "mapping" : "preview",
      upload,
      analysis: result.analysis,
    });
    return null;
  }

  async function onCommit(
    upload: RecruitmentUpload,
    rows: RecruitmentImportRowInput[],
  ): Promise<string | null> {
    const result = await commitRecruitmentImport({
      edition: upload.edition,
      joinedAt: upload.joinedAt,
      rows,
    });
    if (!result.ok) {
      return result.error;
    }
    setState({ step: "summary", summary: result.summary });
    return null;
  }

  return (
    <div className="space-y-6">
      <ol className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {steps.map((step, index) => (
          <li
            key={step.key}
            aria-current={step.key === state.step ? "step" : undefined}
            className={cn(
              step.key === state.step && "text-foreground font-medium",
            )}
          >
            {index + 1}. {step.label}
          </li>
        ))}
      </ol>

      {state.step === "upload" ? (
        <ImportUploadStep defaultValues={uploadDefaults} onUpload={onUpload} />
      ) : null}

      {state.step === "mapping" ? (
        <ColumnMappingStep
          key={JSON.stringify(state.analysis.mapping)}
          analysis={state.analysis}
          onBack={() => {
            setState({ step: "upload" });
          }}
          onConfirm={async (mapping) =>
            onMappingConfirmed(state.upload, state.analysis, mapping)
          }
        />
      ) : null}

      {state.step === "preview" ? (
        <ImportPreviewTable
          analysis={state.analysis}
          sections={sections}
          universityInfo={universityInfo}
          onBack={() => {
            setState({ ...state, step: "mapping" });
          }}
          onSubmit={async (rows) => onCommit(state.upload, rows)}
        />
      ) : null}

      {state.step === "summary" ? (
        <RecruitmentImportSummary
          summary={state.summary}
          onRestart={() => {
            setState({ step: "upload" });
          }}
        />
      ) : null}
    </div>
  );
}

function sameMapping(a: ColumnMapping, b: ColumnMapping): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every(
    (key) => a[key as keyof ColumnMapping] === b[key as keyof ColumnMapping],
  );
}
