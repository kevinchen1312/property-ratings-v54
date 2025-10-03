/**
 * Root page - redirect to /credits
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/credits');
}

