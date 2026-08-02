import test from 'node:test';
import assert from 'node:assert/strict';
import { isDatabaseUnavailableError, withDatabaseFallback } from '../src/lib/db-fallback.ts';
import { fallbackStore } from '../src/lib/fallback-store.ts';

test('detects common database connection errors', () => {
  assert.equal(isDatabaseUnavailableError(new Error('connect ECONNREFUSED 127.0.0.1:5432')), true);
  assert.equal(isDatabaseUnavailableError(new Error('getaddrinfo ENOTFOUND neon.tech')), true);
  assert.equal(isDatabaseUnavailableError(new Error('unexpected payload')), false);
});

test('falls back when the database operation throws a connection error', async () => {
  const result = await withDatabaseFallback(
    async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    },
    async () => ({ ok: true, source: 'fallback' })
  );

  assert.deepEqual(result, { ok: true, source: 'fallback' });
});

test('deletes an event from the fallback store and removes related data', async () => {
  const eventId = 'delete-event-test-1';
  await fallbackStore.addEvent({
    id: eventId,
    tournamentId: 't-delete-test',
    name: 'Delete Test Event',
    type: 'Singles',
    game: 'Badminton',
    meta: {}
  });
  await fallbackStore.addTournament({
    id: 't-delete-test',
    name: 'Delete Test Tournament',
    description: 'For delete tests',
    location: 'Hyderabad',
    registrationStartDate: '2026-08-01T00:00:00.000Z',
    registrationEndDate: '2026-08-10T00:00:00.000Z',
    tournamentStartDate: '2026-08-12T00:00:00.000Z',
    tournamentEndDate: '2026-08-14T00:00:00.000Z',
    status: 'Draft'
  });
  await fallbackStore.addRegistrations([
    {
      employeeId: 'DEL-1',
      providedEmployeeId: 'DEL-1',
      employeeName: 'Delete Me',
      department: 'Ops',
      tournamentId: 't-delete-test',
      eventId,
      eventType: 'Singles',
      location: 'Hyderabad',
      registrationDate: '2026-08-03T00:00:00.000Z'
    }
  ]);

  const deleted = await fallbackStore.deleteEvent(eventId);

  assert.equal(deleted, true);
  assert.equal((await fallbackStore.getEvents()).some((event) => event.id === eventId), false);
  assert.equal((await fallbackStore.getRegistrations(eventId)).length, 0);
});

test('removes a winning registration from the fallback store and keeps champion metadata', async () => {
  const eventId = 'winner-removal-test-1';
  await fallbackStore.addEvent({
    id: eventId,
    tournamentId: 't-winner-test',
    name: 'Winner Removal Event',
    type: 'Singles',
    game: 'Badminton',
    meta: {}
  });
  await fallbackStore.addTournament({
    id: 't-winner-test',
    name: 'Winner Test Tournament',
    description: 'For winner tests',
    location: 'Hyderabad',
    registrationStartDate: '2026-08-01T00:00:00.000Z',
    registrationEndDate: '2026-08-10T00:00:00.000Z',
    tournamentStartDate: '2026-08-12T00:00:00.000Z',
    tournamentEndDate: '2026-08-14T00:00:00.000Z',
    status: 'Draft'
  });
  await fallbackStore.addRegistrations([
    {
      employeeId: 'WIN-1',
      providedEmployeeId: 'WIN-1',
      employeeName: 'Winner Person',
      department: 'Ops',
      tournamentId: 't-winner-test',
      eventId,
      eventType: 'Singles',
      location: 'Hyderabad',
      registrationDate: '2026-08-03T00:00:00.000Z'
    }
  ]);
  await fallbackStore.generateFixtures(eventId, { Hyderabad: ['WIN-1'] });

  const matches = await fallbackStore.getMatches(eventId);
  const match = matches[0];
  const updated = await fallbackStore.updateMatch(match.id, { winner_id: 'WIN-1', status: 'Completed' });
  const registrations = await fallbackStore.getRegistrations(eventId);

  assert.equal(updated?.winner_id, 'WIN-1');
  assert.equal(updated?.status, 'Completed');
  assert.equal(registrations.some((row) => row.employee_id === 'WIN-1'), false);
  assert.equal(updated?.meta?.winner_name, 'Winner Person');
  assert.equal(updated?.meta?.winner_removed, true);
});
