/**
 * /return page
 * Universal link fallback - redirects to app on mobile, shows instructions on desktop
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function ReturnPageContent() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Just show the success message - no deep link attempts
    // Credits will be added via webhook automatically
  }, [sessionId]);

  const handleClose = () => {
    // User can just close the browser and return to the app
    window.close();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>✓</div>
        <h1 className={styles.title}>Payment Complete!</h1>
        <p className={styles.message}>
          Your credits have been purchased successfully.
        </p>
        <p className={styles.submessage}>
          You can now return to the Leadsong app.
        </p>

        <div className={styles.help}>
          <p>Credits will appear in your account within a few seconds.</p>
          <p className={styles.support}>
            Need help?{' '}
            <a href="mailto:support@leadsong.com">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReturnPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.card}>Loading...</div></div>}>
      <ReturnPageContent />
    </Suspense>
  );
}

