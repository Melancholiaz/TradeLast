# TradingJournal Pro V2 — Neon / No Login

โปรเจกต์ Next.js ฉบับเต็ม ใช้ Neon PostgreSQL schema `tradingjournal_v2` โดยไม่มีหน้า Login ไม่มีประวัติ Excel หรือข้อมูลตัวอย่าง ไม่ใช้ localStorage เก็บรายการเทรด

## 1. เปิดใช้งานบน Windows (CMD)

แตก ZIP ลงโฟลเดอร์ใหม่ เปิดโฟลเดอร์ `tradingjournal` (ที่มี package.json) ใน VS Code ใช้ Node.js 22.x แล้วรันทีละคำสั่ง:

```cmd
npm ci
npm run db:setup
npm run db:check
npm run dev
```

เปิด http://localhost:3000/ โดยไม่ต้องกรอกรหัสผ่าน สคริปต์ db:setup สร้างตารางถ้ายังไม่มี ไม่ลบข้อมูลเดิมใน Neon หากมีข้อมูลของอีเมลนี้อยู่แล้วจะแสดงข้อมูลเดิม

## 2. Environment Variables

ไฟล์ `.env.local` ถูกเตรียมด้วยค่าที่ผู้ใช้ให้มาและต้องเก็บเป็นความลับ **อย่าส่ง ZIP นี้ให้ผู้อื่น** เนื่องจากมี Connection String จริงอยู่ด้วย ควรรีเซ็ตรหัสผ่าน Neon ที่เคยเปิดเผย แล้วแก้ DATABASE_URL ใน .env.local และ Vercel ให้เป็นค่าใหม่ก่อนใช้งาน

ไฟล์ `.env.example` มีเฉพาะตัวอย่าง ห้ามใส่รหัสจริงลงไฟล์นี้ `.gitignore` กัน .env.local ไว้แล้ว อย่าบังคับ add ไฟล์ดังกล่าวใน Git และตรวจรายการ Changes ก่อน commit

## 3. Deploy Vercel

```cmd
npm run typecheck
npm run build
```

ถ้าผ่าน ให้สร้าง Git repository ใหม่ หรืออัปเดต repository เดิมโดยตรวจว่าไม่มีไฟล์เก่าที่ไม่ใช้และไม่มี secret ถูก track อยู่ Publish / Push ผ่าน GitHub Desktop และ Import บน Vercel (Next.js, Node.js 22.x)

ใน Vercel Project > Settings > Environment Variables เพิ่ม **Production** ทั้งสามตัวจาก `.env.local` (ไม่ใส่เครื่องหมายคำพูดครอบ Value):

| Key | Value | Type |
|---|---|---|
| DATABASE_URL | Connection String ใหม่จาก Neon | Secret |
| JOURNAL_USER_EMAIL | อีเมลใน .env.local | Config |
| JOURNAL_PUBLIC_ACCESS | true | Config |

กด Save และ Redeploy ให้ค่าใหม่มีผล `.env.local` ไม่ถูกอัปโหลดขึ้น GitHub จึงต้องตั้งค่า Vercel แยกต่างหาก

**ความปลอดภัย:** การเปิด JOURNAL_PUBLIC_ACCESS=true โดยไม่มีระบบป้องกันระดับ deployment หมายถึงทุกคนที่เข้าถึง URL หรือ API สามารถอ่าน แก้ไข ลบ และดาวน์โหลดข้อมูลได้ ควรใช้การป้องกันทั้งเว็บและ API หรือใช้เฉพาะข้อมูลที่ยอมเปิดเผยสาธารณะได้

## 4. ทดสอบ Neon

สร้างบัญชีเทรดจากหน้า Accounts รอ Saved to Neon แล้วเปิด Neon SQL Editor ใน branch และ database เดียวกับ DATABASE_URL รัน:

```sql
SELECT * FROM tradingjournal_v2."TradingAccount";
SELECT * FROM tradingjournal_v2."Trade" ORDER BY "updatedAt" DESC;
```

หากยังไม่มี schema ให้ใช้ `scripts/neon_tables.sql` ใน SQL Editor หรือ `npm run db:setup` จาก CMD

หากขึ้น Set JOURNAL_USER_EMAIL and JOURNAL_PUBLIC_ACCESS=true ให้ตรวจ Environment Variables ของ deployment ที่เปิดอยู่แล้ว Redeploy หากขึ้น Neon read failed ให้ตรวจ DATABASE_URL, schema และ Runtime Logs

## ขอบเขตการตรวจสอบ

ชุดนี้รวมโปรเจกต์ V2 และ No Login Patch เดิม ไม่ได้ทดสอบ Production Build ใหม่หรือเชื่อมต่อ Neon จริงในสภาพแวดล้อมที่จัดไฟล์นี้ ไม่ได้ลบหรือเขียนข้อมูลใดในฐานข้อมูลของคุณ
