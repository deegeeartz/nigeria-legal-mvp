"use client";

import { useAuth } from "@/lib/auth";
import { Users, Scale, FileCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function AdminOverview() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user?.full_name?.split(" ")[0]}!</h2>
        <p className="text-slate-500 mt-1">Here's what's happening on the Nigeria Legal Marketplace today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Pending KYC" 
          value="12" 
          icon={FileCheck} 
          trend="+3 today" 
          color="blue" 
          link="/admin/kyc"
        />
        <MetricCard 
          title="Active Lawyers" 
          value="148" 
          icon={Scale} 
          trend="+5 this week" 
          color="emerald" 
        />
        <MetricCard 
          title="Total Clients" 
          value="1,204" 
          icon={Users} 
          trend="+42 this month" 
          color="indigo" 
        />
        <MetricCard 
          title="Open Complaints" 
          value="3" 
          icon={AlertTriangle} 
          trend="Action required" 
          color="rose" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/admin/kyc" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-colors group">
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-emerald-700">Review Lawyer Applications</p>
                <p className="text-sm text-slate-500">Approve or reject pending KYC submissions</p>
              </div>
              <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">12 Pending</div>
            </Link>
            <Link href="/admin/audit" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-blue-700">View Audit Logs</p>
                <p className="text-sm text-slate-500">Check system activity and compliance events</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Database Connection</span>
              <span className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">NIMC Verification API</span>
              <span className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Operational (Mock)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Paystack Webhooks</span>
              <span className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, color, link }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };
  
  const content = (
    <div className={`p-6 rounded-2xl border ${link ? 'hover:shadow-md transition-shadow bg-white' : 'bg-white'} border-slate-200`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-500 font-medium">{title}</h3>
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className={`text-sm mt-2 font-medium ${color === 'rose' ? 'text-rose-600' : 'text-emerald-600'}`}>
          {trend}
        </p>
      </div>
    </div>
  );

  return link ? <Link href={link} className="block">{content}</Link> : content;
}
