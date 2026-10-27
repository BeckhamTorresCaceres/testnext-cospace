import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ auth: 'login' });
  if (params.redirect) {
    query.set('redirect', params.redirect);
  }
  redirect(`/?${query.toString()}`);
}
