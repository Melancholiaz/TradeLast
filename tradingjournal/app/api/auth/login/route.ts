export async function POST() {
  return Response.json({ error: 'Password login is disabled' }, { status: 404 });
}
