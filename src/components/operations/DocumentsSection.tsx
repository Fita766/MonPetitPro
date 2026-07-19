import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileCheck2,
  FilePlus2,
  Image,
  LoaderCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { buildDocumentReviewTemplate } from "../../lib/documentReview";
import {
  generateSynthesisPdf,
  type SynthesisImage,
} from "../../lib/synthesisPdf";
import type {
  DocumentReviewItem,
  Operation,
  OperationDocument,
  OperationSubsidy,
  OperationTypology,
  SuspensiveCondition,
} from "../../types/domain";

type DetailOperation = Partial<Operation> & Pick<Operation, "id" | "name">;

interface Props {
  operation: DetailOperation;
  documents: OperationDocument[];
  reviewItems: DocumentReviewItem[];
  typologies: OperationTypology[];
  subsidies: OperationSubsidy[];
  conditions: SuspensiveCondition[];
  canEdit: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

const toDataUrl = async (url: string): Promise<string> => {
  const blob = await fetch(url).then((response) => response.blob());
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function DocumentsSection({
  operation,
  documents,
  reviewItems,
  typologies,
  subsidies,
  conditions,
  canEdit,
  onChanged,
  onError,
}: Props) {
  const [kind, setKind] = useState<"plan" | "photo">("plan");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      documents.map(async (document) => {
        const result = await supabase.storage
          .from("operation-documents")
          .createSignedUrl(document.storage_path, 3600);
        return [
          document.id || document.storage_path,
          result.data?.signedUrl || "",
        ] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setUrls(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [documents]);

  const grouped = useMemo(
    () =>
      Object.entries(
        reviewItems.reduce<Record<string, DocumentReviewItem[]>>(
          (result, item) => {
            (result[item.category] ||= []).push(item);
            return result;
          },
          {},
        ),
      ),
    [reviewItems],
  );

  const initialiseReview = async () => {
    setBusy(true);
    const rows = buildDocumentReviewTemplate(operation).map((item) => ({
      operation_id: operation.id,
      category: item.category,
      label: item.label,
      offset_months: item.offset_months,
      expected_date: item.expected_date,
      received_date: item.received_date,
      sort_order: item.sort_order,
    }));
    const { error } = await supabase.from("document_review_items").insert(rows);
    if (error) onError(error.message);
    else onChanged();
    setBusy(false);
  };

  const updateReceivedDate = async (
    item: DocumentReviewItem,
    value: string,
  ) => {
    const { error } = await supabase
      .from("document_review_items")
      .update({ received_date: value || null })
      .eq("id", item.id);
    if (error) onError(error.message);
    else onChanged();
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${operation.id}/${crypto.randomUUID()}-${safeName}`;
    const uploadResult = await supabase.storage
      .from("operation-documents")
      .upload(storagePath, file, { contentType: file.type });
    if (uploadResult.error) onError(uploadResult.error.message);
    else {
      const insertResult = await supabase
        .from("operation_documents")
        .insert({
          operation_id: operation.id,
          kind,
          storage_path: storagePath,
          caption: caption || file.name,
          sort_order: documents.length,
        });
      if (insertResult.error) onError(insertResult.error.message);
      else {
        setCaption("");
        onChanged();
      }
    }
    setBusy(false);
  };

  const exportSynthesis = async () => {
    setBusy(true);
    const imageDocuments = documents.filter(
      (document) =>
        urls[document.id || document.storage_path] &&
        /\.(png|jpe?g|webp)$/i.test(document.storage_path),
    );
    const images: SynthesisImage[] = [];
    for (const document of imageDocuments) {
      try {
        images.push({
          caption: document.caption,
          dataUrl: await toDataUrl(urls[document.id || document.storage_path]),
        });
      } catch {
        /* Le PDF est généré sans l’image inaccessible. */
      }
    }
    generateSynthesisPdf({
      operation,
      typologies,
      subsidies,
      conditions,
      images,
    });
    setBusy(false);
  };

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">
            Livrables
          </p>
          <h2 className="text-xl font-black text-slate-950">
            Fiche opération et revue documentaire
          </h2>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void exportSynthesis()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <Download size={16} />
          )}{" "}
          Fiche de synthèse PDF
        </button>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div>
          {reviewItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <FileCheck2 className="mx-auto text-teal-700" />
              <p className="mt-3 text-sm font-bold text-slate-700">
                La trame reprend automatiquement les échéances de la revue
                documentaire.
              </p>
              {canEdit && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void initialiseReview()}
                  className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-black text-white"
                >
                  Initialiser la revue
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-[620px] space-y-4 overflow-y-auto pr-2">
              {grouped.map(([category, items]) => (
                <div
                  key={category}
                  className="overflow-hidden rounded-2xl border border-slate-200"
                >
                  <h3 className="bg-slate-100 px-4 py-3 text-xs font-black text-slate-800">
                    {category}
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {items?.map((item) => (
                      <div
                        key={item.id || item.label}
                        className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_105px_140px] sm:items-center"
                      >
                        <p className="text-xs font-semibold text-slate-700">
                          {item.label}
                        </p>
                        <span className="text-xs font-bold text-slate-500">
                          {item.expected_date || "À calculer"}
                        </span>
                        <input
                          aria-label={`Date de réception — ${item.label}`}
                          type="date"
                          disabled={!canEdit}
                          value={item.received_date || ""}
                          onChange={(event) =>
                            void updateReceivedDate(item, event.target.value)
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs disabled:bg-slate-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside>
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2">
              <Image size={17} className="text-teal-300" />
              <h3 className="font-black">Plans et photos</h3>
            </div>
            {canEdit && (
              <div className="mt-4 space-y-3">
                <select
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value as "plan" | "photo")
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="plan">Plan</option>
                  <option value="photo">Photo</option>
                </select>
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Légende (facultatif)"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-400 px-3 py-2.5 text-sm font-black text-slate-950">
                  <FilePlus2 size={16} /> Ajouter un fichier
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only"
                    onChange={(event) => void upload(event.target.files?.[0])}
                  />
                </label>
              </div>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {documents.map((document) => (
              <a
                key={document.id || document.storage_path}
                href={urls[document.id || document.storage_path]}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-700 hover:border-teal-400"
              >
                <span className="truncate">
                  {document.caption || document.storage_path.split("/").pop()}
                </span>
                <span className="ml-2 rounded bg-slate-100 px-2 py-1 text-[9px] uppercase">
                  {document.kind}
                </span>
              </a>
            ))}
            {documents.length === 0 && (
              <p className="py-5 text-center text-xs text-slate-400">
                Aucun plan ou photo.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
