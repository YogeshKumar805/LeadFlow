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

  await storage.createLead({
    name: "John Doe",
    mobile: "5550101",
    serviceType: "Consulting",
    city: "New York",
    source: "Website",
    assignedManagerId: manager.id,
    assignedExecutiveId: executive.id,
    assignedBy: admin.id,
    assignmentStage: "EXECUTIVE_ASSIGNED",
    status: "NEW",
    autoAssignLevel1: true,
    autoAssignLevel2: true,
    followUpAt: null,
  });

  console.log("Seeding complete!");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const role = req.query.role as any;
    
    if (user.role === 'MANAGER') {
      // Manager can only see their own executives
      const usersList = await storage.getExecutivesByManager(user.id);
      return res.json(usersList);
    }
    
    if (user.role === 'ADMIN') {
      const usersList = await storage.getUsersByRole(role);
      return res.json(usersList);
    }

    res.status(403).json({ message: "Unauthorized" });
  });

  app.post("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'ADMIN') return res.sendStatus(403);
    try {
      const input = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'ADMIN') return res.sendStatus(403);
    // Implementation needed in storage
    res.sendStatus(200);
  });

  app.post("/api/manager/executives", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'MANAGER') return res.sendStatus(403);
    const manager = req.user as any;
    try {
      const input = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({ 
        ...input, 
        password: hashedPassword,
        role: "EXECUTIVE",
        managerId: manager.id 
      });
      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.leads.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const filters: any = {};
    if (user.role === 'EXECUTIVE') filters.executiveId = user.id;
    else if (user.role === 'MANAGER') filters.managerId = user.id;

    if (req.query.status) filters.status = req.query.status;
    if (req.query.search) filters.search = req.query.search;
    
    const leads = await storage.getLeads(filters);
    res.json(leads);
  });

  app.get(api.leads.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const user = req.user as any;
    if (user.role === 'EXECUTIVE' && lead.assignedExecutiveId !== user.id) return res.sendStatus(403);
    const history = await storage.getAssignmentHistory(lead.id);
    res.json({ ...lead, history });
  });

  app.post(api.leads.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.leads.create.input.parse(req.body);
      const user = req.user as any;
      let lead = await storage.createLead({ ...input, assignedBy: user.id });

      if (lead.autoAssignLevel1) {
        const manager = await storage.getNextManagerRoundRobin();
        if (manager) {
          lead = await storage.updateLead(lead.id, { 
            assignedManagerId: manager.id, 
            assignmentStage: "MANAGER_ASSIGNED" 
          });
          await storage.createAssignmentHistory({
            leadId: lead.id,
            fromRoleId: user.id,
            fromRole: user.role,
            toRoleId: manager.id,
            toRole: "MANAGER",
            level: "MANAGER_LEVEL",
          });
          await storage.createNotification({
            userId: manager.id,
            type: "LEAD_ASSIGNED",
            title: "New Lead Assigned",
            message: `New lead assigned to you: ${lead.name}`,
            relatedLeadId: lead.id
          });

          if (lead.autoAssignLevel2) {
            const exec = await storage.getNextExecutiveRoundRobin(manager.id);
            if (exec) {
              lead = await storage.updateLead(lead.id, { 
                assignedExecutiveId: exec.id, 
                assignmentStage: "EXECUTIVE_ASSIGNED" 
              });
              await storage.createAssignmentHistory({
                leadId: lead.id,
                fromRoleId: manager.id,
                fromRole: "MANAGER",
                toRoleId: exec.id,
                toRole: "EXECUTIVE",
                level: "EXECUTIVE_LEVEL",
              });
              await storage.createNotification({
                userId: exec.id,
                type: "LEAD_ASSIGNED",
                title: "New Lead Assigned",
                message: `New lead assigned to you: ${lead.name}`,
                relatedLeadId: lead.id
              });
            }
          }
        }
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

  app.post(api.leads.assignManager.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'ADMIN') return res.sendStatus(403);
    const { managerId, reason } = api.leads.assignManager.input.parse(req.body);
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.sendStatus(404);
    const updated = await storage.updateLead(lead.id, { 
      assignedManagerId: managerId, 
      assignmentStage: "MANAGER_ASSIGNED" 
    });
    await storage.createAssignmentHistory({
      leadId: lead.id,
      fromRoleId: (req.user as any).id,
      fromRole: "ADMIN",
      toRoleId: managerId,
      toRole: "MANAGER",
      level: "MANAGER_LEVEL",
      reason
    });
    res.json(updated);
  });

  app.post(api.leads.assignExecutive.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { executiveId, reason } = api.leads.assignExecutive.input.parse(req.body);
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.sendStatus(404);
    if (user.role !== 'ADMIN' && (user.role !== 'MANAGER' || lead.assignedManagerId !== user.id)) return res.sendStatus(403);
    const updated = await storage.updateLead(lead.id, { 
      assignedExecutiveId: executiveId, 
      assignmentStage: "EXECUTIVE_ASSIGNED" 
    });
    await storage.createAssignmentHistory({
      leadId: lead.id,
      fromRoleId: user.id,
      fromRole: user.role,
      toRoleId: executiveId,
      toRole: "EXECUTIVE",
      level: "EXECUTIVE_LEVEL",
      reason
    });
    res.json(updated);
  });

  app.put(api.leads.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const input = api.leads.update.input.parse(req.body);
      const user = req.user as any;
      const existingLead = await storage.getLead(id);
      if (!existingLead) return res.sendStatus(404);
      if (user.role === 'EXECUTIVE' && existingLead.assignedExecutiveId !== user.id) return res.sendStatus(403);
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

  app.get(api.dashboard.stats.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const stats = await storage.getDashboardStats(user.id, user.role);
    res.json(stats);
  });

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
