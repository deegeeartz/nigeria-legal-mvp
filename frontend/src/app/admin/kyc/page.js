"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AdminKycPage() {
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [downloadingFor, setDownloadingFor] = useState(null);

  const fetchPending = useCallback(async () => {
    setFetching(true);
    try {
      const res = await authFetch("/api/kyc/pending");
      if (res.ok) {
        const data = await res.json();
        setPending(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "admin") {
        router.push("/login");
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchPending();
      }
    }
  }, [user, loading, router, fetchPending]);

  const handleVerify = async (lawyerId, isApproved) => {
    setProcessing(lawyerId);
    try {
      const res = await authFetch("/api/kyc/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lawyer_id: lawyerId,
          nin_verified: isApproved,
          nba_verified: isApproved,
          bvn_verified: null,
          note: isApproved ? "Call to Bar certificate approved." : "Rejected due to invalid document."
        }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((lw) => lw.lawyer_id !== lawyerId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const downloadCertificate = async (lawyerId) => {
    setDownloadingFor(lawyerId);
    try {
      const res = await authFetch(`/api/kyc/${lawyerId}/certificate/download`);
      if (!res.ok) {
        return;
      }
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = `${lawyerId}-certificate`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingFor(null);
    }
  };

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
           <div>
             <h1 className="text-3xl font-black text-slate-800">KYC Approval Queue</h1>
             <p className="text-slate-500 font-medium">Review Call to Bar certificates and Supreme Court Numbers.</p>
           </div>
           <span className="bg-emerald-100 text-emerald-700 font-bold text-sm px-4 py-2 rounded-full">
             {pending.length} Pending
           </span>
        </div>

        {fetching ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl shadow-sm border border-slate-100">
             <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-700">Inbox Zero!</h3>
             <p className="text-slate-500 font-medium mt-2">There are no pending KYC applications to review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pending.map(lw => (
              <div key={lw.lawyer_id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                   <h3 className="text-xl font-bold text-slate-800">{lw.full_name}</h3>
                   <div className="flex gap-4 mt-2">
                     <span className="bg-slate-100 text-slate-600 px-3 py-1 text-sm font-semibold rounded-lg">SCN: {lw.enrollment_number}</span>
                     <span className="bg-slate-100 text-slate-600 px-3 py-1 text-sm font-semibold rounded-lg">NIN Verified: {lw.nin_verified ? "Yes" : "No"}</span>
                   </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                   <button
                     onClick={() => downloadCertificate(lw.lawyer_id)}
                     disabled={downloadingFor === lw.lawyer_id || !lw.verification_document_id}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-60"
                   >
                     {downloadingFor === lw.lawyer_id ? <Loader2 className="animate-spin w-5 h-5" /> : "View Certificate"}
                   </button>
                   <button 
                     onClick={() => handleVerify(lw.lawyer_id, false)}
                     disabled={processing === lw.lawyer_id}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-rose-100 hover:border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl transition-all"
                   >
                     {processing === lw.lawyer_id ? <Loader2 className="animate-spin w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                     Reject
                   </button>
                   <button 
                     onClick={() => handleVerify(lw.lawyer_id, true)}
                     disabled={processing === lw.lawyer_id}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-sm"
                   >
                     {processing === lw.lawyer_id ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                     Approve
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
