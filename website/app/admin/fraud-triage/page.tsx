// website/app/admin/fraud-triage/page.tsx
// Admin page for fraud triage and review

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/credits';

type Submission = {
  id: string;
  user_id: string;
  property_address: string;
  rating_type: string;
  rating_value: number;
  trust_score: number;
  fraud_flags: string[];
  risk_reason?: string;
  reviewed: boolean;
  created_at: string;
  device_attestation: any;
  ip_geo: any;
  gps: any;
  proof_media: any;
};

export default function FraudTriagePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'unreviewed'>('unreviewed');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'flagged') {
        query = query.lt('trust_score', 50);
      } else if (filter === 'unreviewed') {
        query = query.eq('reviewed', false).lt('trust_score', 50);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const markReviewed = async (submissionId: string, approved: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('submissions')
        .update({
          reviewed: true,
          // Could add approved/rejected status field
        })
        .eq('id', submissionId);

      if (error) throw error;
      
      alert(approved ? 'Submission approved' : 'Submission flagged');
      await loadSubmissions();
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Failed to update submission:', error);
      alert('Failed to update submission');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fraud Triage</h1>
        <p className="text-gray-600">
          Review and manage flagged submissions
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'flagged', 'unreviewed'] as const).map((f) => (
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

      {/* Submissions List */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No submissions found</div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white border rounded-lg p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedSubmission(submission)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <TrustScoreBadge score={submission.trust_score} />
                    {submission.fraud_flags.length > 0 && (
                      <div className="flex gap-1">
                        {submission.fraud_flags.map((flag) => (
                          <span
                            key={flag}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                    {submission.reviewed && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        Reviewed
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <span className="font-medium">{submission.property_address}</span>
                    <span className="text-gray-500 ml-2">
                      {submission.rating_type}: {submission.rating_value}
                    </span>
                  </div>

                  {submission.risk_reason && (
                    <p className="text-sm text-red-600">{submission.risk_reason}</p>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(submission.created_at).toLocaleString()}
                  </div>
                </div>

                <button
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSubmission(submission);
                  }}
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onMarkReviewed={markReviewed}
        />
      )}
    </div>
  );
}

function TrustScoreBadge({ score }: { score: number }) {
  let color = 'green';
  if (score < 35) color = 'red';
  else if (score < 50) color = 'orange';
  else if (score < 70) color = 'yellow';

  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded font-medium text-sm ${colorClasses[color as keyof typeof colorClasses]}`}>
      Trust: {score}
    </span>
  );
}

function SubmissionDetailModal({
  submission,
  onClose,
  onMarkReviewed,
}: {
  submission: Submission;
  onClose: () => void;
  onMarkReviewed: (id: string, approved: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Submission Details</h2>

        <div className="space-y-6">
          {/* Basic Info */}
          <Section title="Basic Information">
            <InfoRow label="Submission ID" value={submission.id} mono />
            <InfoRow label="User ID" value={submission.user_id} mono />
            <InfoRow label="Property" value={submission.property_address} />
            <InfoRow
              label="Rating"
              value={`${submission.rating_type}: ${submission.rating_value}`}
            />
            <InfoRow label="Trust Score" value={submission.trust_score.toString()} />
            <InfoRow
              label="Fraud Flags"
              value={submission.fraud_flags.join(', ') || 'None'}
            />
            {submission.risk_reason && (
              <InfoRow label="Risk Reason" value={submission.risk_reason} />
            )}
          </Section>

          {/* Device Attestation */}
          <Section title="Device Attestation">
            <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(submission.device_attestation, null, 2)}
            </pre>
          </Section>

          {/* Location Data */}
          <Section title="Location Data">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">GPS</h4>
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                  {JSON.stringify(submission.gps, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">IP Geo</h4>
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                  {JSON.stringify(submission.ip_geo, null, 2)}
                </pre>
              </div>
            </div>
          </Section>

          {/* Proof Media */}
          {Object.keys(submission.proof_media || {}).length > 0 && (
            <Section title="Proof Media">
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                {JSON.stringify(submission.proof_media, null, 2)}
              </pre>
            </Section>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => onMarkReviewed(submission.id, true)}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
          >
            Approve & Mark Reviewed
          </button>
          <button
            onClick={() => onMarkReviewed(submission.id, false)}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
          >
            Flag & Mark Reviewed
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="text-sm text-gray-500 w-32 flex-shrink-0">{label}:</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

