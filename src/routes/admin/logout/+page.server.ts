import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ cookies }: RequestEvent) {
  cookies.delete('__admin_session', { path: '/' });
  cookies.delete('__speaker_token', { path: '/' });
  redirect(302, '/admin/login');
}
