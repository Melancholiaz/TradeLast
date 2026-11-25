import { NextResponse, connection } from 'next/server';
import { isSameOrigin, workspaceEmail } from '@/lib/auth';
import { payloadSchema, readJournal, saveJournal, RevisionConflict } from '@/lib/journal-db';
import { z } from 'zod';
const schema = z.object({ state: payloadSchema, revision: z.number().int().nonnegative() });
const reply = (data: unknown, status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET() {
  await connection();
  try {
    const email = workspaceEmail();
    if (!email) return reply({error:'Set JOURNAL_USER_EMAIL and JOURNAL_PUBLIC_ACCESS=true to enable password-free access.'},503);
    return reply(await readJournal(email));
  } catch (e) {
    console.error('Journal read failed', e instanceof Error ? e.message : 'unknown error');
    return reply({error:'Neon read failed. Check DATABASE_URL and run scripts/neon_tables.sql.'},503);
  }
}
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return reply({error:'Invalid origin'},403);
  try {
    const email = workspaceEmail();
    if (!email) return reply({error:'Set JOURNAL_USER_EMAIL and JOURNAL_PUBLIC_ACCESS=true to enable password-free access.'},503);
    const data = await request.text();
    if (Buffer.byteLength(data)>4*1024*1024) return reply({error:'Journal exceeds 4 MB; reduce import size.'},413);
    const parsed = schema.safeParse(JSON.parse(data));
    if (!parsed.success) return reply({error:'Invalid data: '+parsed.error.issues.slice(0,3).map(i=>i.path.join('.')+' '+i.message).join('; ')},400);
    const revision = await saveJournal(email,parsed.data.state,parsed.data.revision);
    return reply({ok:true, revision});
  } catch(e) {
    if (e instanceof RevisionConflict) return reply({error:'ข้อมูลถูกแก้ไขจากอีกแท็บหรือเครื่องแล้ว กรุณาสำรองข้อมูลที่ยังไม่บันทึกและโหลดใหม่'},409);
    if (e instanceof SyntaxError) return reply({error:'Invalid JSON'},400);
    console.error('Journal write failed', e instanceof Error ? e.message : 'unknown error');
    return reply({error:'Neon save failed. Check Runtime Logs and schema.'},503);
  }
}
