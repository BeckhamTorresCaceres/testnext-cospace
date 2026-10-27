import { redirect } from 'next/navigation';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ auth: 'register' });
  if (params.redirect) {
    query.set('redirect', params.redirect);
  }
  redirect(`/?${query.toString()}`);
}
