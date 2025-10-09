// website/app/admin/id-verification/page.tsx
// Admin dashboard for ID verification status

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/credits';

type VerificationStatus = {
  user_id: string;
  verified_submissions: number;
  id_required: boolean;
  id_submitted: boolean;
  id_verified: boolean;
  provider?: string;
  last_prompted_at?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
};

export default function IDVerificationPage() {
  const [statuses, setStatuses] = useState<VerificationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'required' | 'pending' | 'verified'>('all');
  const [stats, setStats] = useState({
    total: 0,
    required: 0,
    submitted: 0,
    verified: 0,
  });

  useEffect(() => {
    loadStatuses();
  }, [filter]);

  const loadStatuses = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('user_verification_status')
        .select('*')
        .order('verified_submissions', { ascending: false });

      if (filter === 'required') {
        query = query.eq('id_required', true).eq('id_verified', false);
      } else if (filter === 'pending') {
        query = query.eq('id_submitted', true).eq('id_verified', false);
      } else if (filter === 'verified') {
        query = query.eq('id_verified', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStatuses(data || []);

      // Load stats
      const { data: statsData } = await supabase
        .from('user_verification_status')
        .select('id_required, id_submitted, id_verified');

      if (statsData) {
        setStats({
          total: statsData.length,
          required: statsData.filter((s) => s.id_required).length,
          submitted: statsData.filter((s) => s.id_submitted).length,
          verified: statsData.filter((s) => s.id_verified).length,
        });
      }
    } catch (error) {
      console.error('Failed to load verification statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const manualVerify = async (userId: string) => {
    if (!confirm('Manually verify this user?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('mark_id_verified', {
        uid: userId,
        provider_name: 'manual_admin',
      });

      if (error) throw error;
      
      alert('User verified successfully');
      await loadStatuses();
    } catch (error) {
      console.error('Failed to verify user:', error);
      alert('Failed to verify user');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ID Verification Dashboard</h1>
        <p className="text-gray-600">
          Monitor and manage user identity verification status
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={stats.total}
          color="blue"
        />
        <StatCard
          title="ID Required"
          value={stats.required}
          color="yellow"
        />
        <StatCard
          title="Submitted"
          value={stats.submitted}
          color="orange"
        />
        <StatCard
          title="Verified"
          value={stats.verified}
          color="green"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'required', 'pending', 'verified'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded font-medium capitalize transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : statuses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No users found</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Verified Submissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {statuses.map((status) => (
                <tr key={status.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">
                    {status.user_id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {status.verified_submissions}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {status.provider || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(status.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!status.id_verified && (
                      <button
                        onClick={() => manualVerify(status.user_id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                      >
                        Manual Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  if (status.id_verified) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ✓ Verified
      </span>
    );
  }

  if (status.id_submitted) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        ⏳ Pending
      </span>
    );
  }

  if (status.id_required) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        ⚠ Required
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      - Not Required
    </span>
  );
}

