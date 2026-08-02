// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

import { pgTable, text, serial, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const registrations = pgTable('registrations', {
	id: serial('id').primaryKey(),
	employee_id: varchar('employee_id', { length: 64 }).notNull(),
	provided_employee_id: varchar('provided_employee_id', { length: 128 }).notNull(),
	employee_name: varchar('employee_name', { length: 256 }).notNull(),
	department: varchar('department', { length: 128 }).default(null),
	tournament_id: varchar('tournament_id', { length: 32 }).notNull(),
	event_id: varchar('event_id', { length: 64 }).notNull(),
	partner_id: varchar('partner_id', { length: 64 }).default(null),
	location: varchar('location', { length: 64 }).notNull(),
	registration_date: timestamp('registration_date').notNull()
});

export const matches = pgTable('matches', {
	id: serial('id').primaryKey(),
	event_id: varchar('event_id', { length: 64 }).notNull(),
	round: varchar('round', { length: 64 }).notNull(),
	player1_id: varchar('player1_id', { length: 64 }).notNull(),
	player2_id: varchar('player2_id', { length: 64 }).default(null),
	winner_id: varchar('winner_id', { length: 64 }).default(null),
	status: varchar('status', { length: 32 }).notNull().default('Scheduled'),
	scheduled_date: timestamp('scheduled_date').default(null),
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

export const insertEventSchema = createInsertSchema(events).omit({});
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const tournaments = pgTable('tournaments', {
	id: varchar('id', { length: 32 }).primaryKey(),
	name: varchar('name', { length: 256 }).notNull(),
	description: varchar('description', { length: 1024 }).notNull(),
	location: varchar('location', { length: 128 }).notNull(),
	registration_start_date: timestamp('registration_start_date').notNull(),
	registration_end_date: timestamp('registration_end_date').notNull(),
	tournament_start_date: timestamp('tournament_start_date').notNull(),
	tournament_end_date: timestamp('tournament_end_date').notNull(),
	status: varchar('status', { length: 64 }).notNull()
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({});
export type InsertTournament = z.infer<typeof insertTournamentSchema>;

export const insertRegistrationSchema = createInsertSchema(registrations).omit({ id: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

export const insertMatchSchema = createInsertSchema(matches).omit({ id: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type Registration = typeof registrations.$inferSelect;
export type Match = typeof matches.$inferSelect;

export { registrations as registrationsTable, matches as matchesTable, events as eventsTable, tournaments as tournamentsTable };