"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, Clock, CreditCard, ShieldCheck, FileText, Loader2, CheckCircle } from "lucide-react";
import { use } from "react";

export default function BookingPage({ params }) {
  const lawyerId = use(params).id;
  const { user, loading, authFetch } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [summary, setSummary] = useState("");
  
  const [step, setStep] = useState(1); // 1 = details, 2 = payment init, 3 = success
  const [isProcessing, setIsProcessing] = useState(false);
  const [consultationId, setConsultationId] = useState(null);
  const [paymentRef, setPaymentRef] = useState(null);

  if (!loading && !user) {
    router.push("/login?redirect=/search");
    return null;
  }

  const handleCreateConsultation = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const scheduledFor = new Date(`${date}T${time}:00`).toISOString();
      const res = await authFetch("/api/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lawyer_id: lawyerId, scheduled_for: scheduledFor, summary }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setConsultationId(data.consultation_id);
        await initPayment(data.consultation_id);
      } else {
         console.error("Consultation booking failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const initPayment = async (cId) => {
    try {
      const res = await authFetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ consultation_id: cId, provider: "paystack" }),
      });
      
      if (res.ok) {
        const payData = await res.json();
        setPaymentRef(payData.reference);
        setStep(2);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const simulatePaystackCompletion = async () => {
    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/payments/paystack/${paymentRef}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outcome: "success" }),
      });
      
      if (res.ok) {
        setStep(3);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800">Book Consultation</h1>
          <p className="text-slate-500 font-medium mt-1 shrink-0 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Booking highly rated Top-Tier NBA Verified Counsel
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleCreateConsultation} className="bg-white p-8 border border-slate-100 rounded-3xl shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-emerald-500 border-none font-medium" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Time</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} required className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-emerald-500 border-none font-medium" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Brief summary of your legal need</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                <textarea 
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="E.g. I need you to review a 12-page commercial lease before I sign it..."
                  required
                  rows={4}
                  className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-emerald-500 border-none font-medium resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase">Consultation Fee</p>
                <p className="text-2xl font-black text-slate-900">₦25,000</p>
              </div>
              <button disabled={isProcessing} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : "Proceed to Payment"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="bg-white p-8 border border-slate-100 rounded-3xl shadow-sm text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Payment Check</h2>
            <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">
              You are about to securely transfer <strong>₦25,000</strong> to escrow via Paystack. Funds are only released when the consultation completes.
            </p>
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl mb-8 flex justify-between items-center max-w-sm mx-auto font-mono text-sm">
               <span className="text-slate-500 font-semibold">Ref:</span>
               <span className="font-bold text-slate-900">{paymentRef}</span>
            </div>
            <button 
              onClick={simulatePaystackCompletion}
              disabled={isProcessing}
              className="w-full md:w-auto px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : "Simulate Paystack Success"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white p-12 border border-slate-100 rounded-3xl shadow-sm text-center">
             <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
             <h2 className="text-3xl font-black text-slate-800 mb-2">Consultation Booked!</h2>
             <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
               Your payment was successful. The lawyer has been notified and you can now securely message them or upload documents.
             </p>
             <button onClick={() => router.push("/dashboard")} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all">
               Go to Dashboard
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
