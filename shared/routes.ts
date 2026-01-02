import { z } from 'zod';
import { insertUserSchema, insertLeadSchema, insertNoteSchema, users, leads, leadNotes, notifications, assignmentHistory } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
        portalRole: z.enum(["ADMIN", "MANAGER", "EXECUTIVE"]),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      input: z.object({
        role: z.enum(["ADMIN", "MANAGER", "EXECUTIVE"]).optional(),
        managerId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  leads: {
    list: {
      method: 'GET' as const,
      path: '/api/leads',
      input: z.object({
        status: z.enum(["NEW", "FOLLOW_UP", "CONVERTED", "CLOSED"]).optional(),
        assignedManagerId: z.coerce.number().optional(),
        assignedExecutiveId: z.coerce.number().optional(),
        assignmentStage: z.enum(["UNASSIGNED", "MANAGER_ASSIGNED", "EXECUTIVE_ASSIGNED"]).optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof leads.$inferSelect & { managerName?: string, executiveName?: string }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/leads/:id',
      responses: {
        200: z.custom<typeof leads.$inferSelect & { history: (typeof assignmentHistory.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/leads',
      input: insertLeadSchema,
      responses: {
        201: z.custom<typeof leads.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/leads/:id',
      input: insertLeadSchema.partial(),
      responses: {
        200: z.custom<typeof leads.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    assignManager: {
      method: 'POST' as const,
      path: '/api/leads/:id/assign-manager',
      input: z.object({
        managerId: z.number(),
        reason: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof leads.$inferSelect>(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    assignExecutive: {
      method: 'POST' as const,
      path: '/api/leads/:id/assign-executive',
      input: z.object({
        executiveId: z.number(),
        reason: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof leads.$inferSelect>(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  notes: {
    list: {
      method: 'GET' as const,
      path: '/api/leads/:leadId/notes',
      responses: {
        200: z.array(z.custom<typeof leadNotes.$inferSelect & { authorName: string }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/leads/:leadId/notes',
      input: insertNoteSchema.omit({ leadId: true, createdBy: true }),
      responses: {
        201: z.custom<typeof leadNotes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          totalLeads: z.number(),
          todayFollowUps: z.number(),
          overdueFollowUps: z.number(),
          convertedCount: z.number(),
          closedCount: z.number(),
          stageStats: z.object({
            unassigned: z.number(),
            managerAssigned: z.number(),
            executiveAssigned: z.number(),
          }).optional(),
        }),
      },
    },
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications',
      responses: {
        200: z.array(z.custom<typeof notifications.$inferSelect>()),
      },
    },
    markRead: {
      method: 'PATCH' as const,
      path: '/api/notifications/:id/read',
      responses: {
        200: z.void(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
