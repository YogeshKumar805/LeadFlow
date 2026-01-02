import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["ADMIN", "MANAGER", "EXECUTIVE"]);
export const leadStatusEnum = pgEnum("status", ["NEW", "FOLLOW_UP", "CONVERTED", "CLOSED"]);
export const assignmentStageEnum = pgEnum("assignment_stage", ["UNASSIGNED", "MANAGER_ASSIGNED", "EXECUTIVE_ASSIGNED"]);
export const historyLevelEnum = pgEnum("history_level", ["MANAGER_LEVEL", "EXECUTIVE_LEVEL"]);
export const notificationTypeEnum = pgEnum("notification_type", ["LEAD_ASSIGNED", "FOLLOW_UP_REMINDER", "OVERDUE"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  managerId: integer("manager_id"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  serviceType: text("service_type").notNull(),
  city: text("city").notNull(),
  source: text("source").notNull(),
  assignedManagerId: integer("assigned_manager_id"),
  assignedExecutiveId: integer("assigned_executive_id"),
  assignedBy: integer("assigned_by"),
  assignmentStage: assignmentStageEnum("assignment_stage").default("UNASSIGNED").notNull(),
  status: leadStatusEnum("status").default("NEW").notNull(),
  followUpAt: timestamp("follow_up_at"),
  autoAssignLevel1: boolean("auto_assign_level1").default(true),
  autoAssignLevel2: boolean("auto_assign_level2").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assignmentHistory = pgTable("assignment_history", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  fromRoleId: integer("from_user_id"),
  fromRole: text("from_role"),
  toRoleId: integer("to_user_id").notNull(),
  toRole: text("to_role").notNull(),
  level: historyLevelEnum("level").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leadNotes = pgTable("lead_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  noteText: text("note_text").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedLeadId: integer("related_lead_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  targetUserId: integer("target_user_id"),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager_executives",
  }),
  executives: many(users, { relationName: "manager_executives" }),
  managedLeads: many(leads, { relationName: "manager_leads" }),
  assignedLeads: many(leads, { relationName: "executive_leads" }),
  notifications: many(notifications),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  manager: one(users, {
    fields: [leads.assignedManagerId],
    references: [users.id],
    relationName: "manager_leads",
  }),
  executive: one(users, {
    fields: [leads.assignedExecutiveId],
    references: [users.id],
    relationName: "executive_leads",
  }),
  history: many(assignmentHistory),
  notes: many(leadNotes),
}));

export const assignmentHistoryRelations = relations(assignmentHistory, ({ one }) => ({
  lead: one(leads, {
    fields: [assignmentHistory.leadId],
    references: [leads.id],
  }),
  toUser: one(users, {
    fields: [assignmentHistory.toRoleId],
    references: [users.id],
  }),
}));

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, {
    fields: [leadNotes.leadId],
    references: [leads.id],
  }),
  author: one(users, {
    fields: [leadNotes.createdBy],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  lastLoginAt: true 
});

export const insertLeadSchema = createInsertSchema(leads).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  followUpAt: z.coerce.date().nullable().optional(),
});

export const insertAssignmentHistorySchema = createInsertSchema(assignmentHistory).omit({
  id: true,
  createdAt: true
});

export const insertNoteSchema = createInsertSchema(leadNotes).omit({ 
  id: true, 
  createdAt: true 
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true,
  isRead: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type AssignmentHistory = typeof assignmentHistory.$inferSelect;
export type InsertAssignmentHistory = z.infer<typeof insertAssignmentHistorySchema>;
export type Note = typeof leadNotes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
