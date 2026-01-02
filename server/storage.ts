import { db } from "./db";
import {
  users, leads, leadNotes, notifications,
  type User, type InsertUser, type Lead, type InsertLead,
  type Note, type InsertNote, type Notification, type InsertNotification
} from "@shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role?: "ADMIN" | "MANAGER" | "EXECUTIVE"): Promise<User[]>;
  getExecutivesByManager(managerId: number): Promise<User[]>;

  // Leads
  getLeads(filters?: { status?: string, assignedTo?: number, search?: string }): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead>;
  
  // Notes
  getLeadNotes(leadId: number): Promise<(Note & { authorName: string })[]>;
  createLeadNote(note: InsertNote): Promise<Note>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;

  // Dashboard
  getDashboardStats(userId: number, role: string): Promise<any>;
  
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

  // User methods
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
    if (role) {
      return db.select().from(users).where(eq(users.role, role));
    }
    return db.select().from(users);
  }

  async getExecutivesByManager(managerId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.managerId, managerId));
  }

  // Lead methods
  async getLeads(filters?: { status?: string, assignedTo?: number, search?: string }): Promise<Lead[]> {
    let conditions = [];
    if (filters?.status) conditions.push(eq(leads.status, filters.status as any));
    if (filters?.assignedTo) conditions.push(eq(leads.assignedTo, filters.assignedTo));
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

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead> {
    const [updatedLead] = await db.update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }

  // Note methods
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

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values(notification).returning();
    return newNotif;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Dashboard Stats
  async getDashboardStats(userId: number, role: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Base conditions
    let leadConditions = [];
    
    // Role filtering
    if (role === 'EXECUTIVE') {
      leadConditions.push(eq(leads.assignedTo, userId));
    } else if (role === 'MANAGER') {
      const team = await this.getExecutivesByManager(userId);
      const teamIds = team.map(u => u.id);
      if (teamIds.length > 0) {
        // Manager sees their team's leads + unassigned? Or just team's. 
        // Spec says "view leads of their executives".
        leadConditions.push(inArray(leads.assignedTo, teamIds));
      } else {
        // No team, sees nothing or just own assignments?
        leadConditions.push(eq(leads.assignedTo, userId)); 
      }
    }
    // ADMIN sees all, so no extra filter needed (empty array)

    const baseWhere = leadConditions.length ? and(...leadConditions) : undefined;
    
    // Counts
    const [totalLeads] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(baseWhere);
    
    const followUpWhere = and(
      baseWhere,
      eq(leads.status, 'FOLLOW_UP'),
      sql`${leads.followUpAt} >= ${today.toISOString()} AND ${leads.followUpAt} < ${tomorrow.toISOString()}`
    );
    const [todayFollowUps] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(followUpWhere);

    const overdueWhere = and(
      baseWhere,
      eq(leads.status, 'FOLLOW_UP'),
      sql`${leads.followUpAt} < ${today.toISOString()}`
    );
    const [overdueFollowUps] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(overdueWhere);

    const [convertedCount] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(baseWhere, eq(leads.status, 'CONVERTED')));
    const [closedCount] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(baseWhere, eq(leads.status, 'CLOSED')));

    const stats: any = {
      totalLeads: Number(totalLeads.count),
      todayFollowUps: Number(todayFollowUps.count),
      overdueFollowUps: Number(overdueFollowUps.count),
      convertedCount: Number(convertedCount.count),
      closedCount: Number(closedCount.count),
    };

    if (role === 'ADMIN' || role === 'MANAGER') {
       // Team performance logic could go here, simplified for now
       stats.teamPerformance = []; 
    }

    return stats;
  }
}

export const storage = new DatabaseStorage();
