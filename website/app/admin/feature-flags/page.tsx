// website/app/admin/feature-flags/page.tsx
// Admin page for managing feature flags

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/credits';

type FeatureFlag = {
  key: string;
  enabled: boolean;
  rollout_pct: number;
  conditions: any;
  description?: string;
  updated_at: string;
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('app_feature_flags')
        .select('*')
        .order('key');

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Failed to load flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFlag = async (flag: FeatureFlag) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('app_feature_flags')
        .update({
          enabled: flag.enabled,
          rollout_pct: flag.rollout_pct,
          conditions: flag.conditions,
        })
        .eq('key', flag.key);

      if (error) throw error;
      
      await loadFlags();
      setEditingFlag(null);
      alert('Flag updated successfully');
    } catch (error) {
      console.error('Failed to update flag:', error);
      alert('Failed to update flag');
    }
  };

  const toggleEnabled = async (flag: FeatureFlag) => {
    await updateFlag({ ...flag, enabled: !flag.enabled });
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Feature Flags</h1>
        <p className="text-gray-600">
          Manage feature flags with staged rollout and conditions
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <div
              key={flag.key}
              className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{flag.key}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        flag.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {flag.key === 'proof_presence_global_kill' && flag.enabled && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        KILL SWITCH ACTIVE
                      </span>
                    )}
                  </div>
                  
                  {flag.description && (
                    <p className="text-sm text-gray-600 mb-3">{flag.description}</p>
                  )}

                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Rollout:</span>{' '}
                      <span className="font-medium">{flag.rollout_pct}%</span>
                    </div>
                    {Object.keys(flag.conditions || {}).length > 0 && (
                      <div>
                        <span className="text-gray-500">Conditions:</span>{' '}
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {JSON.stringify(flag.conditions)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleEnabled(flag)}
                    className={`px-4 py-2 rounded font-medium transition ${
                      flag.enabled
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {flag.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => setEditingFlag(flag)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingFlag && (
        <EditFlagModal
          flag={editingFlag}
          onSave={updateFlag}
          onClose={() => setEditingFlag(null)}
        />
      )}
    </div>
  );
}

function EditFlagModal({
  flag,
  onSave,
  onClose,
}: {
  flag: FeatureFlag;
  onSave: (flag: FeatureFlag) => void;
  onClose: () => void;
}) {
  const [editedFlag, setEditedFlag] = useState(flag);
  const [conditionsJson, setConditionsJson] = useState(
    JSON.stringify(flag.conditions, null, 2)
  );

  const handleSave = () => {
    try {
      const parsedConditions = JSON.parse(conditionsJson);
      onSave({ ...editedFlag, conditions: parsedConditions });
    } catch (error) {
      alert('Invalid JSON in conditions');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Edit Feature Flag</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Key</label>
            <input
              type="text"
              value={editedFlag.key}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-50"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editedFlag.enabled}
                onChange={(e) =>
                  setEditedFlag({ ...editedFlag, enabled: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Enabled</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Rollout Percentage (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={editedFlag.rollout_pct}
              onChange={(e) =>
                setEditedFlag({
                  ...editedFlag,
                  rollout_pct: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Conditions (JSON)
            </label>
            <textarea
              value={conditionsJson}
              onChange={(e) => setConditionsJson(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              rows={10}
              placeholder='{"platform": ["ios", "android"], "countries": ["US"]}'
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported fields: platform, countries, min_app_version, risk_threshold_lte
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

