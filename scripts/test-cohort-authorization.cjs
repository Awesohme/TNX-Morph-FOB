/* Purposeful action/authorization regression tests with Supabase-compatible query mocks.
 * This validates action control flow and scoping, not deployed Postgres RLS or constraints. */
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");
let session = {id:"member",role:"community_manager",email:"member@example.test"};
let writes = [];
const rows = {
  cohorts:[{id:"a"},{id:"b"}],
  cohort_members:[{id:"membership",user_id:"member",cohort_id:"a"}],
  participants:[{id:"p1",cohort_id:"a"},{id:"p2",cohort_id:"b"}],
  profiles:[{id:"member",role:"community_manager",is_active:true},{id:"outsider",role:"facilitator",is_active:true}],
  tasks:[{id:"orphan-a",cohort_id:"a",source_record_type:"participants",source_record_id:"deleted",title:"Follow up",status:"Open"},
    {id:"orphan-b",cohort_id:"b",source_record_type:"participants",source_record_id:"deleted",title:"Follow up",status:"Open"}],
  resources:[{id:"r1",cohort_id:"a"},{id:"r2",cohort_id:"b"},{id:"global",cohort_id:null}],
};
function query(table) {
  let filters=[], operation=null, payload;
  const q = {
    select(){return q}, eq(k,v){filters.push(r=>r[k]===v);return q},
    in(k,values){filters.push(r=>values.includes(r[k]));return q},
    limit(){return q}, update(value){operation="update";payload=value;return q},
    insert(value){operation="insert";payload=value;return q},
    delete(){operation="delete";return q},
    maybeSingle(){return finish(true)}, single(){return finish(true)},
    then(resolve,reject){return finish(false).then(resolve,reject)},
  };
  async function finish(single) {
    const data=(rows[table]||[]).filter(r=>filters.every(f=>f(r)));
    if(operation) writes.push({table,operation,payload,ids:data.map(r=>r.id)});
    return {data:single?(data[0]||null):data,error:single&&operation==="update"&&!data.length?new Error("No row"):null};
  }
  return q;
}
const client={from:query};
const moduleConfig={key:"participants",table:"participants",fields:[],bulkEditableFields:["mvp_status"],route:"/participants"};
let access;
const mocks = {
  "@/lib/auth":{requireUser:async()=>{if(!session.role)throw Error("Inactive");return session},requireRole:async(...roles)=>{if(!roles.includes(session.role))throw Error("Forbidden");return session}},
  "@/lib/supabase/server":{createClient:async()=>client},
  "@/lib/supabase/admin":{createAdminClient:()=>client},
  "@/lib/modules":{getModuleByKey:k=>k==="participants"?moduleConfig:null,getModuleByTable:k=>k==="participants"?moduleConfig:null,humanizeColumn:x=>x},
  "@/lib/record-config":{cmWritableTables:new Set(["participants"]),editableFieldsByTable:{participants:["mvp_status","email"]}},
  "@/lib/workflow":{getModuleField:()=>({}),coerceFieldValue:(_,v)=>v,activityDescription:()=>""},
  "@/lib/utils":{safeErrorMessage:e=>e.message,isMissingRelationError:()=>false},
  "@/lib/sync":{pushRecordToGoogleSheet:async()=>{}},
  "next/cache":{revalidatePath:()=>{}},
  "next/navigation":{redirect:()=>{throw Error("Redirect")}},
};
function load(file) {
  const out={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports:out.exports,module:out,require:name=>name==="@/lib/cohort-access"?access:(mocks[name]||{}),FormData,File:global.File,Buffer,console,Date,Set,Error},{filename:file});
  return out.exports;
}
function form(values){const f=new FormData;for(const[k,v]of Object.entries(values))f.set(k,v);return f}
async function rejectsWrite(fn) {writes=[];await assert.rejects(fn);assert.equal(writes.length,0)}
(async()=>{
  access=load("src/lib/cohort-access.ts");
  const records=load("src/lib/actions/records.ts"), ops=load("src/lib/actions/ops.ts");
  await access.assertCohortAccess(session,"a");
  await assert.rejects(()=>access.assertCohortAccess(session,"b"));
  session={...session,role:"admin"};
  await access.assertCohortAccess(session,"b");
  session={...session,role:"community_manager"};
  await assert.rejects(()=>access.assertLinkedRecord(session,"a","participants","p2"));
  await assert.rejects(()=>access.assertRecordLinks(session,"a",{silent_student_ids:[{id:"p2",name:"Forged"}]}));
  await access.assertRecordLinks(session,"a",{silent_student_ids:["p1"],stuck_student_ids:[{id:"p1",name:"Valid"}]});
  const bulk=v=>records.bulkUpdateRecordsAction(form({table:"participants",field:"mvp_status",value:"Completed",...v}));
  await rejectsWrite(()=>bulk({cohortId:"a",selectedIds:"p1,p2"}));
  await rejectsWrite(()=>bulk({cohortId:"a",selectedIds:"p1,missing"}));
  await rejectsWrite(()=>bulk({selectedIds:"p1"}));
  await rejectsWrite(()=>bulk({cohortId:"b",selectedIds:"p2"}));
  writes=[];await bulk({cohortId:"a",selectedIds:"p1"});
  assert.deepEqual(writes.find(w=>w.table==="participants").ids,["p1"]);
  await rejectsWrite(()=>records.updateRecordFieldAction(form({table:"participants",id:"p2",field:"mvp_status",value:"Completed",returnTo:"/participants?cohort=a"})));
  await rejectsWrite(()=>records.updateRecordFieldAction(form({table:"participants",id:"p1",field:"email",value:"forged@example.test",returnTo:"/participants"})));
  await rejectsWrite(()=>records.createCommentAction(form({cohortId:"a",sourceRecordType:"participants",sourceRecordId:"p2",body:"Forged"})));
  await rejectsWrite(()=>records.createTaskAction(form({cohortId:"a",sourceRecordType:"participants",sourceRecordId:"p2",title:"Forged"})));
  // Updates cannot change source links: forged source fields are ignored, while
  // status, title and reassignment still work after a source has been deleted.
  writes=[];await records.updateTaskAction(form({taskId:"orphan-a",status:"Done",title:"Updated",assignedTo:"member",sourceRecordType:"participants",sourceRecordId:"p2"}));
  const orphanUpdate=writes.find(w=>w.table==="tasks");
  assert.deepEqual(orphanUpdate.ids,["orphan-a"]);assert.equal(orphanUpdate.payload.status,"Done");
  assert.equal(orphanUpdate.payload.title,"Updated");assert.equal(orphanUpdate.payload.assigned_to,"member");
  assert.equal("source_record_id" in orphanUpdate.payload,false);assert.equal("cohort_id" in orphanUpdate.payload,false);
  await rejectsWrite(()=>records.updateTaskAction(form({taskId:"orphan-b",status:"Done",cohortId:"a"})));
  session={...session,role:"admin"};writes=[];await records.updateTaskAction(form({taskId:"orphan-b",status:"Done"}));
  assert.deepEqual(writes.find(w=>w.table==="tasks").ids,["orphan-b"]);
  session={...session,role:"community_manager"};
  await rejectsWrite(()=>ops.attachResourceToRecordAction(form({cohortId:"a",sourceRecordType:"participants",sourceRecordId:"p1",resourceId:"r2"})));
  await rejectsWrite(()=>ops.deleteResourceAction(form({resourceId:"global"})));
  writes=[];await ops.attachResourceToRecordAction(form({cohortId:"a",sourceRecordType:"participants",sourceRecordId:"p1",resourceId:"global"}));
  assert.equal(writes.find(w=>w.table==="record_resources").payload.resource_id,"global");
  session={...session,role:"admin"};writes=[];await bulk({cohortId:"b",selectedIds:"p2"});
  assert.deepEqual(writes.find(w=>w.table==="participants").ids,["p2"]);
  session={...session,role:"community_manager"};
  writes=[];assert.equal((await ops.setAttendanceWeekAction(form({cohortId:"b",attendanceWeek:"Week 1"}))).ok,false);assert.equal(writes.length,0);
  for (const values of [
    {attendanceOpensAt:"2026-02-30T12:00",timezoneOffsetMinutes:"0"},
    {attendanceOpensAt:"2026-10-25T12:00",attendanceClosesAt:"2026-10-25T11:00",timezoneOffsetMinutes:"0"},
    {attendanceOpensAt:"2026-10-25T12:00",timezoneOffsetMinutes:"garbage"}
  ]) {writes=[];assert.equal((await ops.setAttendanceWindowAction(form({cohortId:"a",...values}))).ok,false);assert.equal(writes.length,0)}
  writes=[];assert.equal((await ops.setAttendanceWindowAction(form({cohortId:"a"}))).ok,true);
  const saved=writes.find(w=>w.table==="cohorts").payload;assert.equal(saved.attendance_opens_at,null);assert.equal(saved.attendance_closes_at,null);
  session={...session,role:null};await assert.rejects(()=>access.assertCohortAccess(session,"a"));
  console.log("PASS: cohort membership/admin/inactive, forged/mixed/missing bulk IDs, linked participants/tasks/comments/resources, returnTo bypass, orphan task edits without link mutation, attendance denial/date/clear regressions.");
})().catch(e=>{console.error(e);process.exitCode=1});
