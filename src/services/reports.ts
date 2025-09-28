import { supabase } from '../lib/supabase';

export type PropertyReport = {
  overall: { avg_all: number | null };
  avg_by_attribute: Record<'noise'|'friendliness'|'cleanliness', number | null>;
  weekly: { week_start: string; avg_stars: number }[];
  monthly: { month_start: string; avg_stars: number }[];
  log: { date: string; attribute: 'noise'|'friendliness'|'cleanliness'; stars: number }[];
};

export async function getPropertyReport(
  propertyId: string, 
  from: string, 
  to: string
): Promise<PropertyReport> {
  const { data, error } = await supabase.rpc('get_property_report', {
    p_property_id: propertyId,
    p_from: from,
    p_to: to
  });

  if (error) {
    throw new Error(`Failed to fetch property report: ${error.message}`);
  }

  if (!data) {
    throw new Error('No report data returned');
  }

  return data as PropertyReport;
}
