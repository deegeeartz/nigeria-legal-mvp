"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Download, FileText, Loader2, Upload, XCircle } from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  booked: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default function ConsultationsPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [consultations, setConsultations] = useState([]);
  const [selectedConsultationId, setSelectedConsultationId] = useState("");
  const [documents, setDocuments] = useState([]);

  const [fetchingConsultations, setFetchingConsultations] = useState(true);
  const [fetchingDocuments, setFetchingDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [documentLabel, setDocumentLabel] = useState("supporting_document");
  const [file, setFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (loading || !user) {
      return;
    }

    const loadConsultations = async () => {
      setFetchingConsultations(true);
      setErrorMessage("");
      try {
        const response = await authFetch("/api/consultations");
        if (response.ok) {
          const payload = await response.json();
          setConsultations(payload);
          if (payload.length > 0) {
            setSelectedConsultationId(String(payload[0].consultation_id));
          }
        } else {
          setErrorMessage("Unable to load consultations right now.");
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load consultations right now.");
      } finally {
        setFetchingConsultations(false);
      }
    };

    void loadConsultations();
  }, [authFetch, loading, router, user]);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!selectedConsultationId) {
        setDocuments([]);
        return;
      }

      setFetchingDocuments(true);
      setErrorMessage("");
      try {
        const response = await authFetch(`/api/consultations/${selectedConsultationId}/documents`);
        if (response.ok) {
          setDocuments(await response.json());
        } else {
          setErrorMessage("Unable to load documents for this consultation.");
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load documents for this consultation.");
      } finally {
        setFetchingDocuments(false);
      }
    };

    void loadDocuments();
  }, [authFetch, selectedConsultationId]);

  const selectedConsultation = useMemo(
    () => consultations.find((item) => String(item.consultation_id) === selectedConsultationId),
    [consultations, selectedConsultationId],
  );

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!selectedConsultationId || !file) {
      return;
    }

    setUploading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const form = new FormData();
      form.append("document_label", documentLabel);
      form.append("file", file);

      const response = await authFetch(`/api/consultations/${selectedConsultationId}/documents`, {
        method: "POST",
        body: form,
      });

      if (response.ok) {
        const created = await response.json();
        setDocuments((previous) => [created, ...previous]);
        setFile(null);
        setSuccessMessage("Document uploaded successfully.");
      } else {
        setErrorMessage("Upload failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (documentId, filename) => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await authFetch(`/api/documents/${documentId}/download`);
      if (!response.ok) {
        setErrorMessage("Download failed. Please try again.");
        return;
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setSuccessMessage(`Downloaded ${filename}.`);
    } catch (error) {
      console.error(error);
      setErrorMessage("Download failed. Please try again.");
    }
  };

  const updateStatus = async (newStatus) => {
    if (!selectedConsultationId) return;
    setUpdatingStatus(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await authFetch(`/api/consultations/${selectedConsultationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        const updated = await response.json();
        setConsultations((prev) =>
          prev.map((c) => (String(c.consultation_id) === selectedConsultationId ? updated : c)),
        );
        setSuccessMessage(`Consultation marked as ${newStatus}.`);
      } else {
        const err = await response.json().catch(() => ({}));
        setErrorMessage(err.detail || "Status update failed.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Status update failed. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-slate-800">Consultation Workspace</h1>
        <p className="text-slate-500 font-medium mt-1 mb-8">Manage consultations and supporting documents securely.</p>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {fetchingConsultations ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
            <Loader2 className="animate-spin text-emerald-500 w-10 h-10 mx-auto" />
          </div>
        ) : consultations.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No consultations available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 lg:col-span-1">
              <h2 className="font-bold text-slate-800 mb-3">Your Consultations</h2>
              <div className="space-y-2">
                {consultations.map((item) => (
                  <button
                    key={item.consultation_id}
                    onClick={() => setSelectedConsultationId(String(item.consultation_id))}
                    className={`w-full text-left px-3 py-3 rounded-xl border ${
                      String(item.consultation_id) === selectedConsultationId
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-100"
                    }`}
                  >
                    <p className="font-semibold text-slate-800 text-sm">Consultation #{item.consultation_id}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.scheduled_for}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 lg:col-span-2">
              <h2 className="font-bold text-slate-800 mb-1">Documents</h2>
              {selectedConsultation && (
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <p className="text-sm text-slate-500">
                    Consultation #{selectedConsultation.consultation_id} •{" "}
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedConsultation.status] || ""}`}>
                      {selectedConsultation.status}
                    </span>
                  </p>
                  {selectedConsultation.status !== "cancelled" && selectedConsultation.status !== "completed" && (
                    <div className="flex gap-2">
                      {(user.role === "lawyer" || user.role === "admin") && (
                        <button
                          onClick={() => updateStatus("completed")}
                          disabled={updatingStatus}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark Complete
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus("cancelled")}
                        disabled={updatingStatus}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 disabled:opacity-60"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={uploadDocument} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <input
                  value={documentLabel}
                  onChange={(event) => setDocumentLabel(event.target.value)}
                  className="md:col-span-2 px-3 py-3 rounded-xl border border-slate-200"
                  placeholder="Document label"
                  required
                />
                <input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="md:col-span-1 px-3 py-3 rounded-xl border border-slate-200"
                  required
                />
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="md:col-span-1 px-3 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </form>

              {fetchingDocuments ? (
                <div className="py-8 text-center">
                  <Loader2 className="animate-spin text-emerald-500 w-8 h-8 mx-auto" />
                </div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-slate-500">No documents uploaded for this consultation yet.</p>
              ) : (
                <ul className="space-y-3">
                  {documents.map((item) => (
                    <li key={item.document_id} className="border border-slate-100 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{item.original_filename}</p>
                        <p className="text-xs text-slate-500">{item.document_label} • {item.content_type}</p>
                      </div>
                      <button
                        onClick={() => downloadDocument(item.document_id, item.original_filename)}
                        className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-emerald-600 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
