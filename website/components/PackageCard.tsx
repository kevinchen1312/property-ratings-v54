'use client';

import { useState } from 'react';
import { PackageKey } from '@/lib/config';
import styles from './PackageCard.module.css';

interface PackageCardProps {
  packageKey: PackageKey;
  credits: number;
  price: number;
  pricePerCredit: number;
  popular?: boolean;
  savings?: string;
}

export default function PackageCard({
  packageKey,
  credits,
  price,
  pricePerCredit,
  popular,
  savings,
}: PackageCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.card} ${popular ? styles.popular : ''}`}>
      {popular && <div className={styles.popularBadge}>Most Popular</div>}
      {savings && <div className={styles.savingsBadge}>{savings}</div>}

      <div className={styles.cardContent}>
        <div className={styles.creditsAmount}>{credits}</div>
        <div className={styles.creditsLabel}>
          {credits === 1 ? 'Credit' : 'Credits'}
        </div>

        <div className={styles.price}>${price.toFixed(2)}</div>
        <div className={styles.pricePerCredit}>
          ${pricePerCredit.toFixed(2)} per credit
        </div>

        <button
          onClick={handlePurchase}
          disabled={loading}
          className={styles.button}
        >
          {loading ? 'Processing...' : 'Buy Now'}
        </button>

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

