import { redirect } from 'next/navigation';

/**
 * Legacy redirect — the canonical CLI authorization page is now /login/device.
 * Old CLI builds that used /cli/authorize will land here and be transparently redirected.
 */
export default function LegacyCliAuthorizePage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const target = searchParams.code
    ? `/login/device?code=${encodeURIComponent(searchParams.code)}`
    : '/login/device';
  redirect(target);
}
