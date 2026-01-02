import { db } from "./db";
import {
  users, leads, leadNotes, notifications, assignmentHistory, managerExecutiveMap,
  type User, type Lead, type AssignmentHistory, type Note, type Notification, 
  type InsertUser, type InsertLead, type InsertNote, type InsertNotification, type InsertAssignmentHistory
} from "@shared/schema";
import { eq, and, sql, desc, inArray, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role?: "ADMIN" | "MANAGER" | "EXECUTIVE"): Promise<User[]>;
  getExecutivesByManager(managerId: number): Promise<User[]>;
  
  getLeads(filters?: { status?: string, managerId?: number, executiveId?: number, stage?: string, search?: string }): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: Partial<Lead>): Promise<Lead>;
  
  createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory>;
  getAssignmentHistory(leadId: number): Promise<AssignmentHistory[]>;
  
  getLeadNotes(leadId: number): Promise<(Note & { authorName: string })[]>;
  createLeadNote(note: InsertNote): Promise<Note>;

  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;

  getDashboardStats(userId: number, role: string): Promise<any>;
  
  // Assignment Algorithms
  getNextManagerRoundRobin(): Promise<User | undefined>;
  getNextExecutiveRoundRobin(managerId: number): Promise<User | undefined>;
  getManagerWithLeastWorkload(): Promise<User | undefined>;
  getExecutiveWithLeastWorkload(managerId: number): Promise<User | undefined>;
  
  sessionStore: any;
}

import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUsersByRole(role?: "ADMIN" | "MANAGER" | "EXECUTIVE"): Promise<User[]> {
    if (role) return db.select().from(users).where(and(eq(users.role, role), eq(users.isActive, true)));
    return db.select().from(users).where(eq(users.isActive, true));
  }

  async getExecutivesByManager(managerId: number): Promise<User[]> {
    const maps = await db.select()
      .from(managerExecutiveMap)
      .where(and(eq(managerExecutiveMap.managerId, managerId), eq(managerExecutiveMap.isActive, true)));
    
    if (maps.length === 0) return [];
    
    return db.select().from(users).where(inArray(users.id, maps.map(m => m.executiveId)));
  }

  async getLeads(filters?: { status?: string, managerId?: number, executiveId?: number, stage?: string, search?: string }): Promise<Lead[]> {
    let conditions = [];
    if (filters?.status) conditions.push(eq(leads.status, filters.status as any));
    if (filters?.managerId) conditions.push(eq(leads.assignedManagerId, filters.managerId));
    if (filters?.executiveId) conditions.push(eq(leads.assignedExecutiveId, filters.executiveId));
    if (filters?.stage) conditions.push(eq(leads.assignmentStage, filters.stage as any));
    
    if (filters?.search) {
      const searchLower = `%${filters.search.toLowerCase()}%`;
      conditions.push(sql`lower(${leads.name}) LIKE ${searchLower} OR lower(${leads.mobile}) LIKE ${searchLower} OR lower(${leads.city}) LIKE ${searchLower}`);
    }

    return db.select()
      .from(leads)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: number, updates: Partial<Lead>): Promise<Lead> {
    const [updatedLead] = await db.update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }

  async createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory> {
    const [newHistory] = await db.insert(assignmentHistory).values(history).returning();
    return newHistory;
  }

  async getAssignmentHistory(leadId: number): Promise<AssignmentHistory[]> {
    return db.select().from(assignmentHistory).where(eq(assignmentHistory.leadId, leadId)).orderBy(asc(assignmentHistory.createdAt));
  }

  async getLeadNotes(leadId: number): Promise<(Note & { authorName: string })[]> {
    return db.select({
      ...leadNotes,
      authorName: users.name
    })
    .from(leadNotes)
    .leftJoin(users, eq(leadNotes.createdBy, users.id))
    .where(eq(leadNotes.leadId, leadId))
    .orderBy(desc(leadNotes.createdAt));
  }

  async createLeadNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(leadNotes).values(note).returning();
    return newNote;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values(notification).returning();
    return newNotif;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async getDashboardStats(userId: number, role: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let baseWhere = undefined;
    if (role === 'EXECUTIVE') baseWhere = eq(leads.assignedExecutiveId, userId);
    else if (role === 'MANAGER') baseWhere = eq(leads.assignedManagerId, userId);

    const [total] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(baseWhere);
    const [todayF] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(baseWhere, eq(leads.status, 'FOLLOW_UP'), sql`${leads.followUpAt} >= ${today.toISOString()} AND ${leads.followUpAt} < ${tomorrow.toISOString()}`));
    const [overdue] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(baseWhere, eq(leads.status, 'FOLLOW_UP'), sql`${leads.followUpAt} < ${today.toISOString()}`));
    const [conv] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(baseWhere, eq(leads.status, 'CONVERTED')));
    const [closed] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(baseWhere, eq(leads.status, 'CLOSED')));

    return {
      totalLeads: Number(total.count),
      todayFollowUps: Number(todayF.count),
      overdueFollowUps: Number(overdue.count),
      convertedCount: Number(conv.count),
      closedCount: Number(closed.count),
    };
  }

  // Round Robin
  async getNextManagerRoundRobin(): Promise<User | undefined> {
    const managers = await this.getUsersByRole("MANAGER");
    if (managers.length === 0) return undefined;
    
    const [lastAssignment] = await db.select()
      .from(assignmentHistory)
      .where(eq(assignmentHistory.level, 'MANAGER_LEVEL'))
      .orderBy(desc(assignmentHistory.createdAt))
      .limit(1);
    
    if (!lastAssignment) return managers[0];
    
    const lastIndex = managers.findIndex(m => m.id === lastAssignment.toRoleId);
    return managers[(lastIndex + 1) % managers.length];
  }

  async getNextExecutiveRoundRobin(managerId: number): Promise<User | undefined> {
    const executives = await this.getExecutivesByManager(managerId);
    if (executives.length === 0) return undefined;

    const [lastAssignment] = await db.select()
      .from(assignmentHistory)
      .where(and(eq(assignmentHistory.level, 'EXECUTIVE_LEVEL'), eq(assignmentHistory.fromRoleId, managerId)))
      .orderBy(desc(assignmentHistory.createdAt))
      .limit(1);

    if (!lastAssignment) return executives[0];

    const lastIndex = executives.findIndex(e => e.id === lastAssignment.toRoleId);
    return executives[(lastIndex + 1) % executives.length];
  }

  // Least Workload
  async getManagerWithLeastWorkload(): Promise<User | undefined> {
    const managers = await this.getUsersByRole("MANAGER");
    if (managers.length === 0) return undefined;

    const workloads = await Promise.all(managers.map(async m => {
      const [count] = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(and(eq(leads.assignedManagerId, m.id), inArray(leads.status, ['NEW', 'FOLLOW_UP'])));
      return { manager: m, count: Number(count.count) };
    }));

    return workloads.sort((a, b) => a.count - b.count)[0].manager;
  }

  async getExecutiveWithLeastWorkload(managerId: number): Promise<User | undefined> {
    const executives = await this.getExecutivesByManager(managerId);
    if (executives.length === 0) return undefined;

    const workloads = await Promise.all(executives.map(async e => {
      const [count] = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(and(eq(leads.assignedExecutiveId, e.id), inArray(leads.status, ['NEW', 'FOLLOW_UP'])));
      return { executive: e, count: Number(count.count) };
    }));

    return workloads.sort((a, b) => a.count - b.count)[0].executive;
  }
}

export const storage = new DatabaseStorage();
