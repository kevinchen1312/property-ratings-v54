import { supabase } from '../lib/supabase';

// Replace with your actual Supabase project reference
const SUPABASE_REF = "oyphcjbickujybvbeame";

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  popular?: boolean;
  description: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 1,
    price: 10.00,
    pricePerCredit: 10.00,
    description: 'Perfect for trying out our reports'
  },
  {
    id: 'value',
    name: 'Value Pack',
    credits: 5,
    price: 45.00,
    pricePerCredit: 9.00,
    popular: true,
    description: 'Most popular choice - save $5'
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 10,
    price: 80.00,
    pricePerCredit: 8.00,
    description: 'For serious property researchers - save $20'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 25,
    price: 175.00,
    pricePerCredit: 7.00,
    description: 'Best value for bulk purchases - save $75'
  }
];

export async function createCreditCheckout(packageId: string, userEmail?: string) {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    
    if (!token) {
      throw new Error("Not authenticated");
    }

    const email = userEmail || session.session?.user?.email;
    if (!email) {
      throw new Error("No email address available");
    }

    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      throw new Error("Invalid credit package");
    }

    console.log(`Creating checkout for ${creditPackage.name} (${creditPackage.credits} credits)`);

    const response = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/createCreditCheckout`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        packageId,
        email,
        credits: creditPackage.credits,
        price: creditPackage.price
      }),
    });

    const result = await response.json();
    console.log("Credit checkout response:", result);
    
    if (!response.ok) {
      throw new Error(result.error || "Failed to create checkout");
    }

    return result;
  } catch (error) {
    console.error("Credit checkout error:", error);
    throw error;
  }
}

export async function getUserCredits(): Promise<number> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      console.log('❌ No user session found');
      return 0;
    }

    console.log('👤 Fetching credits for user:', session.session.user.id);

    const { data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', session.session.user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching user credits:', error);
      return 0;
    }

    console.log('✅ Credits from database:', data?.credits || 0);
    return data?.credits || 0;
  } catch (error) {
    console.error('❌ Error in getUserCredits:', error);
    return 0;
  }
}
