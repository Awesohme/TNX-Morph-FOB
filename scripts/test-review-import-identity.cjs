const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const output = ts.transpileModule(fs.readFileSync('src/lib/import-server.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const subject = {};
vm.runInNewContext(output, {
  exports: subject,
  require: (name) => name.endsWith('/participants')
    ? { buildParticipantFullName: (first, last) => [first, last].filter(Boolean).join(' ') }
    : { PARTICIPANT_APPLICATION_FIELD_KEYS: [] },
});
const resolve = subject.resolveReviewImportIdentity;
const people = [{ id: 'a', full_name: 'Ada Example' }, { id: 'b', full_name: 'Ada Example' }];
const row = { week: 'Week 2', participant_name: 'Ada Example' };
const reviews = [{ id: 'ra', participant_id: 'a', participant_name: 'Ada Example', week: 'Week 2' }];
assert.throws(() => resolve(row, people, reviews), /ambiguous/);
assert.equal(resolve({ ...row, participant_id: 'b' }, people, reviews).existingId, null);
assert.equal(resolve({ ...row, participant_id: 'a' }, people, reviews).existingId, 'ra');
assert.equal(resolve(row, people, reviews, 'ra').participantId, 'a');
assert.throws(() => resolve({ ...row, participant_id: 'b' }, people, reviews, 'ra'), /does not match/);
assert.throws(() => resolve({ ...row, participant_id: 'foreign' }, people, reviews), /selected cohort/);
assert.throws(() => resolve(row, people, reviews, 'foreign'), /selected cohort/);
assert.throws(() => resolve({ ...row, week: 'Week 3' }, people, reviews, 'ra'), /different week/);
const legacy = [{ id: 'legacy', participant_name: ' Ada  Example ', week: 'Week 2' }];
assert.equal(resolve(row, people.slice(0, 1), legacy).existingId, 'legacy');
assert.equal(resolve({ ...row, participant_id: 'a' }, people, legacy).existingId, null);
assert.throws(() => resolve(row, people.slice(0, 1), [...legacy, { ...legacy[0], id: 'other' }]), /Multiple reviews/);
assert.equal(resolve({ ...row, participant_id: 'a', participant_name: 'New name' }, people, reviews).existingId, 'ra');

(async () => {
  const candidates = Array.from({ length: 1251 }, (_, index) => ({ id: String(index) }));
  const offsets = [];
  const client = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({
    range: async (start, end) => {
      offsets.push(start);
      return { data: candidates.slice(start, end + 1), error: null };
    },
  }) }) }) }) };
  const loaded = await subject.loadCohortImportRows(client, 'participants', 'cohort');
  assert.equal(loaded.length, 1251);
  assert.deepEqual(offsets, [0, 500, 1000, 1251]);
  console.log('Review import identity: duplicate names, stable IDs, legacy ambiguity, cohort isolation, record binding, rename, and full pagination passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
