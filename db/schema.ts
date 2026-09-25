import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['rsvp', 'wish'] }).notNull(),
  name: text('name').notNull(),
  attendance: text('attendance'),
  guests: integer('guests'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
