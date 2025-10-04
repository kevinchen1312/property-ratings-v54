/**
 * /credits page
 * Main credit purchase page with package selection
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser, getUserCredits } from '@/lib/supabaseServer';
import { CREDIT_PACKAGES } from '@/lib/config';
import PackageCard from '@/components/PackageCard';
import SignOutButton from '@/components/SignOutButton';
import styles from './page.module.css';
import { createServerClient } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/config';

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: { access_token?: string };
}) {
  // Handle access token from URL (from mobile app)
  if (searchParams.access_token) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    
    // Set the session from the access token
    await supabase.auth.setSession({
      access_token: searchParams.access_token,
      refresh_token: '', // Will be filled by Supabase
    });
  }

  // Server-side auth check
  const user = await getCurrentUser();

  if (!user) {
    // Redirect to auth page
    redirect('/auth?next=/credits');
  }

  // Fetch user's current credit balance
  const currentCredits = await getUserCredits(user.id);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Buy Credits</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>Current Balance</span>
            <span className={styles.balanceValue}>{currentCredits}</span>
            <span className={styles.balanceUnit}>credits</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      <section className={styles.howItWorks}>
        <h2>How it works</h2>
        <ol>
          <li>Choose a credit package below</li>
          <li>Complete payment securely via Stripe</li>
          <li>Return to the app automatically</li>
          <li>Your credits will appear within seconds</li>
        </ol>
      </section>

      <section className={styles.packages}>
        <div className={styles.packagesGrid}>
          {(Object.keys(CREDIT_PACKAGES) as Array<keyof typeof CREDIT_PACKAGES>).map(
            (key) => {
              const pkg = CREDIT_PACKAGES[key];
              return (
                <PackageCard
                  key={key}
                  packageKey={key}
                  credits={pkg.credits}
                  price={pkg.price}
                  pricePerCredit={pkg.pricePerCredit}
                  popular={pkg.popular}
                  savings={pkg.savings}
                />
              );
            }
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          Payments are processed securely by{' '}
          <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
            Stripe
          </a>
        </p>
        <p className={styles.support}>
          Questions? Contact{' '}
          <a href="mailto:support@leadsong.com">support@leadsong.com</a>
        </p>
      </footer>
    </div>
  );
}

