import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  totalPoints: integer("total_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
});

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  acceptanceRate: integer("acceptance_rate"),
  averageSAT: integer("average_sat"),
  averageGPA: integer("average_gpa"),
});

export const quests = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), 
  points: integer("points").notNull(),
  requirements: jsonb("requirements").notNull(), 
  createdAt: timestamp("created_at").defaultNow(),
});

export const userQuests = pgTable("user_quests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  questId: integer("quest_id").references(() => quests.id).notNull(),
  status: text("status").notNull(), 
  progress: jsonb("progress").notNull(), 
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), 
  icon: text("icon").notNull(), 
  points: integer("points").notNull(),
  requirements: jsonb("requirements").notNull(), 
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  content: text("content").notNull(),
  isAI: boolean("is_ai").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSchools = pgTable("user_schools", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  status: text("status").notNull(), 
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chanceMe = pgTable("chance_me", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  schoolId: integer("school_id").references(() => schools.id).notNull(),
  gpa: integer("gpa").notNull(),
  sat: integer("sat"),
  act: integer("act"),
  extracurriculars: text("extracurriculars").notNull(),
  essays: text("essays").notNull(),
  aiAnalysis: text("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schoolRelations = relations(schools, ({ many }) => ({
  userSchools: many(userSchools),
  chanceMes: many(chanceMe),
  messages: many(messages),
}));

export const userRelations = relations(users, ({ many }) => ({
  userSchools: many(userSchools),
  chanceMes: many(chanceMe),
  messages: many(messages),
  userQuests: many(userQuests),
  userAchievements: many(userAchievements),
}));

export const questRelations = relations(quests, ({ many }) => ({
  userQuests: many(userQuests),
}));

export const achievementRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;