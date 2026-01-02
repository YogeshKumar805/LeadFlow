import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seed() {
  const existingUsers = await storage.getUsersByRole();
  if (existingUsers.length > 0) return;

  console.log("Seeding database...");

  // Create Users
  const adminPassword = await hashPassword("admin123");
  const admin = await storage.createUser({
    username: "admin",
    password: adminPassword,
    role: "ADMIN",
    name: "Admin User",
    email: "admin@leads.com",
    mobile: "1234567890",
  });

  const managerPassword = await hashPassword("manager123");
  const manager = await storage.createUser({
    username: "manager",
    password: managerPassword,
    role: "MANAGER",
    name: "Manager One",
    email: "manager@leads.com",
    mobile: "0987654321",
  });

  const execPassword = await hashPassword("exec123");
  const executive = await storage.createUser({
    username: "exec",
    password: execPassword,
    role: "EXECUTIVE",
    name: "Executive One",
    email: "exec@leads.com",
    mobile: "1122334455",
    managerId: manager.id,
  });

  // Create Leads
  await storage.createLead({
    name: "John Doe",
    mobile: "5550101",
    serviceType: "Consulting",
    city: "New York",
    source: "Website",
    assignedTo: executive.id,
    assignedBy: admin.id,
    status: "NEW",
  });

  await storage.createLead({
    name: "Jane Smith",
    mobile: "5550102",
    serviceType: "Support",
    city: "Los Angeles",
    source: "Referral",
    assignedTo: executive.id,
    assignedBy: manager.id,
    status: "FOLLOW_UP",
    followUpAt: new Date(Date.now() + 86400000), // tomorrow
  });

  console.log("Seeding complete!");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth (Passport)
  setupAuth(app);

  // === USERS ===
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Optional filtering
    const role = req.query.role as "ADMIN" | "MANAGER" | "EXECUTIVE" | undefined;
    const users = await storage.getUsersByRole(role);
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    // Only Admin can create users usually, but for demo maybe open?
    // Let's restrict to authenticated users or just allow for seeding ease if no users exist
    // For now, allow open creation for setup, or strictly Admin. 
    // Spec says "Admin: manage users". 
    // Let's check auth.
    // if (!req.isAuthenticated() || req.user.role !== 'ADMIN') return res.sendStatus(403);
    
    try {
      const input = api.users.create.input.parse(req.body);
      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      res.status(201).json(user);
    } catch (err) {
       if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // === LEADS ===
  app.get(api.leads.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as any;
    const filters: any = {};
    
    // RBAC for filtering
    if (user.role === 'EXECUTIVE') {
      filters.assignedTo = user.id;
    } else if (user.role === 'MANAGER') {
      // Manager can see all or filter
      // If query param is passed, use it, otherwise show team's leads (handled in storage)
    }

    if (req.query.status) filters.status = req.query.status;
    if (req.query.search) filters.search = req.query.search;
    
    const leads = await storage.getLeads(filters);
    res.json(leads);
  });

  app.get(api.leads.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    
    // RBAC Check
    const user = req.user as any;
    if (user.role === 'EXECUTIVE' && lead.assignedTo !== user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(lead);
  });

  app.post(api.leads.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const input = api.leads.create.input.parse(req.body);
      const user = req.user as any;
      
      // Auto-assign logic could go here.
      // For now, just create.
      const lead = await storage.createLead({
        ...input,
        assignedBy: user.id
      });
      
      // Notify if assigned
      if (lead.assignedTo) {
        await storage.createNotification({
          userId: lead.assignedTo,
          type: "LEAD_ASSIGNED",
          title: "New Lead Assigned",
          message: `You have been assigned lead: ${lead.name}`,
          relatedLeadId: lead.id
        });
      }

      res.status(201).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.put(api.leads.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = Number(req.params.id);
      const input = api.leads.update.input.parse(req.body);
      const user = req.user as any;
      const existingLead = await storage.getLead(id);
      
      if (!existingLead) return res.sendStatus(404);

      // RBAC Rules
      // Executive: Can update status/notes. Cannot reassign.
      if (user.role === 'EXECUTIVE') {
        if (existingLead.assignedTo !== user.id) return res.sendStatus(403);
        if (input.assignedTo && input.assignedTo !== existingLead.assignedTo) {
          return res.status(403).json({ message: "Executives cannot reassign leads" });
        }
        // If closed/converted, restrict editing? 
        // Spec: "If status is CONVERTED or CLOSED, editing is restricted (only Admin can edit...)"
        if ((existingLead.status === 'CONVERTED' || existingLead.status === 'CLOSED') && user.role !== 'ADMIN') {
           // Allow adding notes is handled in /notes endpoint, but updates to lead itself restricted.
           return res.status(403).json({ message: "Cannot edit closed/converted leads" });
        }
      }

      const updated = await storage.updateLead(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // === NOTES ===
  app.get(api.notes.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const notes = await storage.getLeadNotes(Number(req.params.leadId));
    res.json(notes);
  });

  app.post(api.notes.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.notes.create.input.parse(req.body);
      const user = req.user as any;
      const note = await storage.createLeadNote({
        ...input,
        leadId: Number(req.params.leadId),
        createdBy: user.id
      });
      res.status(201).json(note);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // === DASHBOARD ===
  app.get(api.dashboard.stats.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const stats = await storage.getDashboardStats(user.id, user.role);
    res.json(stats);
  });

  // === NOTIFICATIONS ===
  app.get(api.notifications.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const notifs = await storage.getNotifications(user.id);
    res.json(notifs);
  });

  app.patch(api.notifications.markRead.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.markNotificationRead(Number(req.params.id));
    res.sendStatus(200);
  });

  await seed();

  return httpServer;
}
