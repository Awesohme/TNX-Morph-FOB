/** Run with: node --env-file=.env.local scripts/test-database-isolation.mjs
 * All assertions run inside one ROLLBACK-only transaction. Migration DDL targets
 * a fresh isolated schema; public-table fixtures test deployed RLS and never commit.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const { Client } = pg;
if (!process.env.SUPABASE_DB_PASSWORD) throw new Error('SUPABASE_DB_PASSWORD is required.');
const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'aws-0-eu-west-1.pooler.supabase.com',
  port: Number(process.env.SUPABASE_DB_PORT || 5432), database:'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres.juumpbxhrdautvcckncx',
  password:process.env.SUPABASE_DB_PASSWORD, ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:10000,
});
const schema='audit_'+randomUUID().replaceAll('-','');
const ids=Array.from({length:18},()=>randomUUID());
const [a,b,u,d1,d2,repeated,bu,rUnique,rShared,rRepeat1,rRepeat2,cmA,cmB,admin,publicA,publicB,publicPA,publicPB]=ids;
const sql=await readFile(new URL('../supabase/migrations/027_review_participant_identity.sql',import.meta.url),'utf8');
let begun=false;
try {
 await client.connect();await client.query('begin');begun=true;
 await client.query("set local statement_timeout='15s'; set local lock_timeout='3s'");
 await client.query(`create schema ${schema}`);
 for(const table of ['participants','assignment_reviews','activity_events'])await client.query(`create table ${schema}.${table} (like public.${table} including defaults including indexes)`);
 await client.query(`insert into ${schema}.participants(id,cohort_id,full_name) values ($1,$2,'Unique Student'),($3,$2,'Shared Name'),($4,$2,'Shared Name'),($5,$2,'Repeated Review'),($6,$7,'Unique Student')`,[u,a,d1,d2,repeated,bu,b]);
 await client.query(`insert into ${schema}.assignment_reviews(id,cohort_id,week,participant_name) values ($1,$2,'Week 1',' Unique  Student '),($3,$2,'Week 1','Shared Name'),($4,$2,'Week 1','Repeated Review'),($5,$2,'Week 1','Repeated Review')`,[rUnique,a,rShared,rRepeat1,rRepeat2]);
 const isolated=sql.replaceAll('public.',schema+'.');
 await client.query(isolated);
 let rows=(await client.query(`select id,participant_id from ${schema}.assignment_reviews`)).rows;
 assert.equal(rows.find(r=>r.id===rUnique).participant_id,u);
 assert.equal(rows.find(r=>r.id===rShared).participant_id,null);
 assert.equal(rows.find(r=>r.id===rRepeat1).participant_id,null);
 await client.query(isolated); // Reapplication must preserve bindings and definitions.
 await client.query(`insert into ${schema}.assignment_reviews(cohort_id,participant_id,week,participant_name,review_status,feedback_summary,reviewer,submitted_at) values ($1,$2,'Week 1','Shared Name','Closed','Previous feedback','Keep this reviewer','2026-01-01'),($1,$3,'Week 1','Shared Name','Not Reviewed',null,null,null)`,[a,d1,d2]);
 await client.query(`insert into ${schema}.assignment_reviews(cohort_id,participant_id,week,participant_name,submitted,submitted_at,review_status,feedback_summary,quality_score,final_status,feedback_sent,resubmission_needed) values ($1,$2,'Week 1','Shared Name',true,now(),'Not Reviewed',null,null,null,false,false) on conflict (cohort_id,participant_id,week) do update set submitted=excluded.submitted,submitted_at=excluded.submitted_at,review_status=excluded.review_status,feedback_summary=null,quality_score=null,final_status=null,feedback_sent=false,resubmission_needed=false`,[a,d1]);
 rows=(await client.query(`select * from ${schema}.assignment_reviews where participant_id in ($1,$2)`,[d1,d2])).rows;
 assert.equal(rows.length,2);assert.equal(rows.find(r=>r.participant_id===d1).reviewer,'Keep this reviewer');
 let events=(await client.query(`select payload from ${schema}.activity_events`)).rows;
 assert.equal(events.length,1);assert.equal(events[0].payload.previous_review.feedback_summary,'Previous feedback');
 // Even a decision on an unsubmitted/Not Reviewed row must survive a replacement.
 await client.query(`update ${schema}.assignment_reviews set submitted=false,review_status='Not Reviewed',final_status='Decision only',feedback_sent=true where participant_id=$1`,[d2]);
 await client.query(`update ${schema}.assignment_reviews set submitted=true,submitted_at=now(),final_status=null,feedback_sent=false where participant_id=$1`,[d2]);
 events=(await client.query(`select payload from ${schema}.activity_events`)).rows;
 assert.equal(events.length,2);assert(events.some(e=>e.payload.previous_review.final_status==='Decision only'));
 console.log('PASS: migration backfill, duplicate-name isolation, idempotence, unique upsert, reviewer retention and atomic assessment archive.');
 // Validate actual deployed public RLS with transaction-only identities and cohorts.
 for(const [id,role] of [[cmA,'community_manager'],[cmB,'community_manager'],[admin,'admin']]){
  const email=`audit-${id}@example.invalid`;
  await client.query("insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values ($1,'authenticated','authenticated',$2,'{}','{}')",[id,email]);
  await client.query('insert into public.profiles(id,email,role,is_active) values($1,$2,$3,true) on conflict(id) do update set role=excluded.role,is_active=true',[id,email,role]);
 }
 await client.query("insert into public.cohorts(id,name,slug,status) values($1,'Audit rollback A',$2,'planning'),($3,'Audit rollback B',$4,'planning')",[publicA,'audit-'+publicA,publicB,'audit-'+publicB]);
 await client.query("insert into public.cohort_members(cohort_id,user_id,role) values($1,$2,'community_manager'),($3,$4,'community_manager')",[publicA,cmA,publicB,cmB]);
 await client.query("insert into public.participants(id,cohort_id,full_name,is_test_data) values($1,$2,'Audit rollback A',true),($3,$4,'Audit rollback B',true)",[publicPA,publicA,publicPB,publicB]);
 for(const [id,allowed] of [[cmA,[publicA]],[cmB,[publicB]],[admin,[publicA,publicB]]]){
  await client.query('set local role authenticated');
  await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[id]);
  const visible=(await client.query('select id from public.cohorts where id=any($1::uuid[])',[ [publicA,publicB] ])).rows.map(r=>r.id).sort();
  assert.deepEqual(visible,[...allowed].sort());
  const changed=(await client.query("update public.participants set mvp_status='In Progress' where cohort_id=any($1::uuid[]) returning cohort_id",[[publicA,publicB]])).rows.map(r=>r.cohort_id).sort();
  assert.deepEqual(changed,[...allowed].sort());
  await client.query('reset role');
 }
 console.log('PASS: deployed RLS isolates two cohort members; admin sees/updates both. All fixtures and DDL rolled back.');
} finally {
 if(begun)await client.query('rollback');
 await client.end();
}
