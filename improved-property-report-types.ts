// Enhanced PropertyReport types with additional features

export type RatingAttribute = 'noise' | 'friendliness' | 'cleanliness';

export type PropertyReport = {
  // Basic statistics
  overall: { 
    avg_all: number | null;
    total_ratings: number;
    unique_users: number;
  };
  
  // Attribute-specific data
  avg_by_attribute: Record<RatingAttribute, {
    average: number | null;
    count: number;
    trend: 'improving' | 'declining' | 'stable' | null;
  }>;
  
  // Time-series data
  weekly: { 
    week_start: string; 
    avg_stars: number;
    rating_count: number;
  }[];
  
  monthly: { 
    month_start: string; 
    avg_stars: number;
    rating_count: number;
  }[];
  
  // Detailed activity log
  log: { 
    date: string; 
    attribute: RatingAttribute; 
    stars: number;
    user_id?: string; // Optional for privacy
  }[];
  
  // Additional insights
  insights: {
    best_attribute: RatingAttribute | null;
    worst_attribute: RatingAttribute | null;
    most_active_day: string | null;
    rating_distribution: Record<1|2|3|4|5, number>;
  };
  
  // Metadata
  metadata: {
    property_id: string;
    property_name: string;
    date_range: {
      from: string;
      to: string;
    };
    generated_at: string;
  };
};

// Enhanced function signature with better error handling
export async function getPropertyReport(
  propertyId: string, 
  from: string, 
  to: string,
  options?: {
    includeUserIds?: boolean;
    aggregationLevel?: 'daily' | 'weekly' | 'monthly';
    maxLogEntries?: number;
  }
): Promise<PropertyReport | null>;

// Helper types for the implementation
export type RatingData = {
  id: string;
  attribute: RatingAttribute;
  stars: number;
  created_at: string;
  user_id: string;
};

export type PropertyInfo = {
  id: string;
  name: string;
  address: string;
};

// Example usage:
/*
const report = await getPropertyReport(
  'property-123',
  '2024-01-01',
  '2024-12-31',
  {
    includeUserIds: false, // For privacy
    aggregationLevel: 'weekly',
    maxLogEntries: 100
  }
);

if (report) {
  console.log(`Overall rating: ${report.overall.avg_all}`);
  console.log(`Best attribute: ${report.insights.best_attribute}`);
  console.log(`Total ratings: ${report.overall.total_ratings}`);
}
*/
