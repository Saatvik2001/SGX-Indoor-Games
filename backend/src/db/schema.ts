import { pgTable, text, serial, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import type { z } from 'zod';

export const registrations = pgTable('registrations', {
	id: serial('id').primaryKey(),
	employee_id: varchar('employee_id', { length: 64 }).notNull(),
	provided_employee_id: varchar('provided_employee_id', { length: 128 }).notNull(),
	employee_name: varchar('employee_name', { length: 256 }).notNull(),
	department: varchar('department', { length: 128 }),
	tournament_id: varchar('tournament_id', { length: 32 }).notNull(),
	event_id: varchar('event_id', { length: 64 }).notNull(),
	partner_id: varchar('partner_id', { length: 64 }),
	location: varchar('location', { length: 64 }).notNull(),
	registration_date: timestamp('registration_date').notNull()
});

export const matches = pgTable('matches', {
	id: serial('id').primaryKey(),
	event_id: varchar('event_id', { length: 64 }).notNull(),
	round: varchar('round', { length: 64 }).notNull(),
	player1_id: varchar('player1_id', { length: 64 }).notNull(),
	player2_id: varchar('player2_id', { length: 64 }),
	winner_id: varchar('winner_id', { length: 64 }),
	status: varchar('status', { length: 32 }).notNull().default('Scheduled'),
	scheduled_date: timestamp('scheduled_date'),
	meta: jsonb('meta').default('{}')
});

export const events = pgTable('events', {
	id: varchar('id', { length: 64 }).primaryKey(),
	tournament_id: varchar('tournament_id', { length: 32 }).notNull(),
	name: varchar('name', { length: 256 }).notNull(),
	type: varchar('type', { length: 32 }).notNull(),
	game: varchar('game', { length: 64 }).notNull(),
	meta: jsonb('meta').default('{}')
});

export const insertEventSchema = createInsertSchema(events);
export type InsertEvent = typeof events.$inferInsert;

export const tournaments = pgTable('tournaments', {
	id: varchar('id', { length: 32 }).primaryKey(),
	name: varchar('name', { length: 256 }).notNull(),
	location: varchar('location', { length: 64 }),
	start_date: timestamp('start_date'),
	end_date: timestamp('end_date'),
	status: varchar('status', { length: 32 }).default('Active')
});

export const insertTournamentSchema = createInsertSchema(tournaments);
export type InsertTournament = typeof tournaments.$inferInsert;
