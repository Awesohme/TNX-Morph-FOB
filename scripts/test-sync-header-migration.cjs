const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/lib/sync.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const subject = {};
const initialHeaders = ['week', '', 'participant_name', 'app_record_id'];
const initialRow = ['Week 2', 'unused cell', 'Ada Example', 'review-uuid'];
let sheet = [initialHeaders.slice(), initialRow.slice()];
const writes = [];
const dbWrites = [];
const record = { id: 'review-uuid', participant_id: 'participant-uuid', participant_name: 'Ada Example', week: 'Week 2' };
const config = { id: 'config', dataset_key: 'reviews', cohort_id: 'cohort', spreadsheet_id: 'sheet', sheet_name: 'Reviews', header_row: 1 };
const client = { from: (table) => ({
  select: () => ({ eq: () => ({ order: async () => ({ data: [config], error: null }) }) }),
  insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'run' }, error: null }) }) }),
  update: (payload) => ({ eq: async (_key, id) => { dbWrites.push({ table, id, payload }); return { error: null }; } }),
}) };
const dataset = {
  key: 'reviews',
  fields: ['week', 'participant_id', 'participant_name'].map((key) => ({ key })),
  transformRow: (row) => ({ ...row }),
  serializeRecord: (row) => ({ week: row.week, participant_id: row.participant_id, participant_name: row.participant_name }),
};
const mocks = {
  '@/lib/supabase/admin': { createAdminClient: () => client },
  '@/lib/env': { getServerEnv: () => ({ googleServiceAccountEmail: 'test', googleServiceAccountPrivateKey: 'test' }) },
  '@/lib/import-config': { getImportDataset: () => dataset },
  '@/lib/import-server': {
    loadCohortImportRows: async (_client, table) => table === 'participants' ? [{ id: 'participant-uuid' }] : [{ ...record }],
    resolveReviewImportIdentity: (row, _people, _reviews, appRecordId) => {
      assert.equal(appRecordId, 'review-uuid', 'existing review ID must stay in its original column');
      assert.equal(row.participant_id, '', 'old review ID must never be interpreted as participant ID');
      assert.equal(row.participant_name, 'Ada Example', 'empty header gap must retain its column position');
      return { participantId: 'participant-uuid', existingId: 'review-uuid' };
    },
  },
  '@/lib/cohort-access': {},
  '@/lib/auth': {},
  '@/lib/google-sheets': {
    columnNumberToLetter: (number) => String.fromCharCode(64 + number),
    hashSheetRow: (row) => JSON.stringify(row),
    getSheetValues: async () => ({ values: sheet.map((row) => row.slice()) }),
    updateSheetRange: async (_id, range, values) => {
      writes.push({ range, values });
      sheet[Number(range.match(/!A(\d+):/)[1]) - 1] = [...values[0]];
    },
    appendSheetRows: async () => { throw new Error('Existing review must be updated, never appended.'); },
  },
};
vm.runInNewContext(source, { exports: subject, require: (name) => mocks[name] });

(async () => {
  assert.deepEqual(Array.from(subject.extendSheetHeaders([], ['week', 'app_record_id'])), ['week', 'app_record_id']);
  await subject.runGoogleSheetSync();
  assert.deepEqual(Array.from(writes[0].values[0]), [...initialHeaders, 'participant_id']);
  assert.equal(sheet[0].indexOf('app_record_id'), 3);
  assert.equal(sheet[1][3], 'review-uuid');
  assert.equal(sheet[1][4], 'participant-uuid');
  assert.equal(dbWrites.find((write) => write.table === 'assignment_reviews').payload.participant_id, 'participant-uuid');
  config.header_row = 3;
  sheet = [['Title'], [], initialHeaders.slice(), initialRow.slice()];
  writes.length = 0;
  await subject.runGoogleSheetSync();
  assert.equal(writes[0].range, 'Reviews!A3:E3');
  assert.equal(writes[1].range, 'Reviews!A4:E4');
  assert.equal(sheet[3][3], 'review-uuid');
  console.log('Sheets header migration: existing review ID column, interior gaps, appended participant ID, empty-sheet headers, header-row offsets, and existing-row update passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
