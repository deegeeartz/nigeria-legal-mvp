"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Search, ShieldCheck, Scale, Clock, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-1 pb-16 md:pb-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 pt-24 pb-32">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />
        
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight"
          >
            Expert Legal Help in Nigeria, <span className="text-emerald-400">Verified & Transparent.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-medium"
          >
            Connect instantly with NBA-verified lawyers. See up-front consultation fees. Get the justice and advice you deserve without the friction.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 max-w-xl mx-auto flex flex-col sm:flex-row gap-4"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="What legal issue do you need help with?"
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 text-lg"
              />
            </div>
            <Link href="/search" className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 text-lg">
              Find Lawyers
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <Link
              href="/login/lawyer"
              className="text-center py-3 rounded-2xl bg-white/10 border border-emerald-300/30 text-emerald-200 hover:bg-white/20 font-bold transition-colors"
            >
              I am a lawyer
            </Link>
            <Link
              href="/login/client"
              className="text-center py-3 rounded-2xl bg-white/10 border border-slate-300/30 text-slate-100 hover:bg-white/20 font-bold transition-colors"
            >
              I am a client
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="-mt-12 relative z-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { tag: "Verified Counsel", icon: ShieldCheck, title: "100% NBA Verified", desc: "Every lawyer goes through strict KYC and NBA enrollment verification." },
            { tag: "Transparent", icon: Scale, title: "Up-front Flat Fees", desc: "Know exactly what your consultation costs before you book." },
            { tag: "Fast Access", icon: Clock, title: "Instant Booking", desc: "Book times that work for you and start communicating right away." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-start hover:-translate-y-1 transition-transform"
            >
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 mb-6">
                <feature.icon strokeWidth={2.5} size={28} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">{feature.tag}</span>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to action for lawyers */}
      <section className="mt-24 px-6 mb-12">
         <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-500" />
            <div className="relative p-10 md:p-16 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-8">
              <div>
                <h3 className="text-3xl font-black text-white mb-4">Are you a Legal Professional?</h3>
                <p className="text-emerald-50 text-lg font-medium max-w-xl">
                  Join our network of verified lawyers. Build your reputation, manage clients completely digitally, and grow your practice across Nigeria.
                </p>
              </div>
              <Link href="/signup/lawyer" className="flex items-center gap-2 bg-white text-emerald-600 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-50 transition-colors shrink-0">
                Join as a Lawyer
                <ChevronRight size={20} />
              </Link>
            </div>
         </div>
      </section>
    </div>
  );
}
