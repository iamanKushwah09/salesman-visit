import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  CheckCircle2,
  Receipt,
  Users,
  Navigation,
  MapPinned,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [recentCollections, setRecentCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [sumRes, visitsRes, collRes] = await Promise.all([
          api.get('/visits/summary/today'),
          api.get('/visits?limit=5'),
          api.get('/collections?limit=5'),
        ]);

        if (sumRes.success) setSummary(sumRes.summary);
        if (visitsRes.success) setRecentVisits(visitsRes.visits || []);
        if (collRes.success) setRecentCollections(collRes.collections || []);
      } catch (err) {
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Dashboard"
        subtitle="Overview of daily visits, collections, and salesmen activity"
      />

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Visits Completed */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Today Visits
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {summary?.completedVisitsToday ?? 0}
                <span className="text-xs font-semibold text-slate-400 font-normal ml-1">
                  / {summary?.totalVisitsToday ?? 0} Done
                </span>
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {summary?.totalVisitsToday > 0
                    ? Math.round((summary.completedVisitsToday / summary.totalVisitsToday) * 100)
                    : 100}
                  % Completion
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Today Collected */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">
                Today Collections
              </span>
              <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
                ₹ {Number(summary?.totalCollectionToday ?? 0).toLocaleString()}
              </p>
              <span className="text-[10.5px] text-slate-400 block mt-1">Payment receipts recorded</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Active Salesmen */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                Active Salesmen
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-300 mt-1">
                {summary?.totalActiveSalesmen ?? 0}
                <span className="text-xs font-semibold text-slate-400 font-normal ml-1.5">Staff</span>
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Active on Field</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center">
              <Navigation className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Customer Base */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Customers
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {summary?.totalParties ?? 0}
                <span className="text-xs font-semibold text-slate-400 font-normal ml-1.5">Stores</span>
              </p>
              <span className="text-[10.5px] text-slate-400 block mt-1">Registered customer list</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Live Field Tracking Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Live Tracking
            </span>
            <h3 className="text-lg font-bold tracking-tight">Real-Time Field Salesman Tracking</h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              View active field salesmen on the live map, inspect route progress, and monitor customer visits in real time.
            </p>
          </div>

          <button
            onClick={() => navigate('/live-radar')}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition flex items-center gap-2 self-start md:self-auto shrink-0"
          >
            <Navigation className="w-4 h-4" />
            <span>Open Live Tracking</span>
          </button>
        </div>

        {/* Dual Grid: Recent Customer Visits & Collections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Visits */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Recent Field Visits</span>
              </h4>
              <button
                onClick={() => navigate('/visits')}
                className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentVisits.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No visits recorded today yet.</div>
              ) : (
                recentVisits.map((v) => (
                  <div
                    key={v._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100/70 transition text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{v.party?.name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-500">
                        Salesman: <span className="font-semibold text-slate-700 dark:text-slate-300">{v.salesman?.name}</span> • Purpose: {v.purpose}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {v.status}
                      </span>
                      {v.collectionAmount > 0 && (
                        <p className="text-[11px] font-bold text-purple-600 mt-0.5">
                          ₹ {Number(v.collectionAmount).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Collections */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                <span>Recent Payment Receipts</span>
              </h4>
              <button
                onClick={() => navigate('/collections')}
                className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentCollections.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No payment receipts logged today.</div>
              ) : (
                recentCollections.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{c.party?.name || 'Customer'}</p>
                      <span className="font-mono text-[10px] text-purple-600 font-bold">{c.receiptNo}</span>
                      <span className="text-slate-400 text-[11px]"> • {c.paymentMode}</span>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-extrabold text-purple-700 dark:text-purple-300">
                        ₹ {Number(c.amount).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400">by {c.salesman?.name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

