import { pgTable, text, timestamp, uuid, varchar, index, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionsUserIdIdx: index('sessions_user_id_idx').on(t.userId),
    sessionsExpiresAtIdx: index('sessions_expires_at_idx').on(t.expiresAt),
  }),
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationsUserIdIdx: index('conversations_user_id_idx').on(t.userId),
  }),
);

export const conversationMessages = pgTable(
  'conversation_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 16 }).notNull(),
    content: text('content').notNull(),
    modelId: varchar('model_id', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    convMsgsConvIdIdx: index('conversation_messages_conv_id_idx').on(t.conversationId),
  }),
);

export const studyDisciplines = pgTable(
  'study_disciplines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 512 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    studyDisciplinesUserExtUq: uniqueIndex('study_disciplines_user_ext_uq').on(t.userId, t.externalId),
    studyDisciplinesUserIdx: index('study_disciplines_user_id_idx').on(t.userId),
  }),
);

export const studyQuestions = pgTable(
  'study_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disciplineId: uuid('discipline_id')
      .notNull()
      .references(() => studyDisciplines.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 64 }).notNull(),
    payload: jsonb('payload').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    studyQuestionsDiscExtUq: uniqueIndex('study_questions_disc_ext_uq').on(t.disciplineId, t.externalId),
    studyQuestionsDisciplineIdx: index('study_questions_discipline_id_idx').on(t.disciplineId),
  }),
);

export const userSrsProgress = pgTable('user_srs_progress', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userDesempenho = pgTable('user_desempenho', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
