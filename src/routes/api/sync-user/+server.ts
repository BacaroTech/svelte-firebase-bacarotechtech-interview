import { json } from '@sveltejs/kit';

export async function POST() {
    return json({ error: 'Not available' }, { status: 404 });
}
