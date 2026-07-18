import { Prisma } from '@prisma/client';
import { ClsServiceManager } from 'nestjs-cls';

export const auditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allModels: {
        async create({ model, operation, args, query }) {
          const result = await query(args);
          await logAudit(client, model, 'create', args, result, null, result);
          return result;
        },
        async update({ model, operation, args, query }) {
          // Find old record
          const pkField = args.where?.id ? 'id' : Object.keys(args.where || {})[0];
          let oldRecord = null;
          if (pkField && args.where?.[pkField]) {
            oldRecord = await (client as any)[model].findUnique({ where: args.where });
          }
          
          const result = await query(args);
          await logAudit(client, model, 'update', args, result, oldRecord, result);
          return result;
        },
        async delete({ model, operation, args, query }) {
          const pkField = args.where?.id ? 'id' : Object.keys(args.where || {})[0];
          let oldRecord = null;
          if (pkField && args.where?.[pkField]) {
            oldRecord = await (client as any)[model].findUnique({ where: args.where });
          }
          
          const result = await query(args);
          await logAudit(client, model, 'delete', args, result, oldRecord, null);
          return result;
        },
      },
    },
  });
});

async function logAudit(
  client: any,
  model: string,
  action: 'create' | 'update' | 'delete',
  args: any,
  result: any,
  oldRecord: any,
  newRecord: any,
) {
  if (model === 'AuditLog' || model === 'UsedRefreshToken') return;

  const cls = ClsServiceManager.getClsService();
  if (!cls) return;

  const user = cls.get('user');
  if (!user) return;

  const householdId = newRecord?.householdId || oldRecord?.householdId || args.data?.householdId || null;
  const entityId = result?.id || oldRecord?.id || 'unknown';

  const changes: any = {};
  if (action === 'create') {
    changes.new = newRecord;
  } else if (action === 'update') {
    changes.old = oldRecord;
    changes.new = newRecord;
  } else if (action === 'delete') {
    changes.old = oldRecord;
  }

  try {
    await client.$queryRaw`
      INSERT INTO "audit_log" ("id", "householdId", "userId", "action", "entityType", "entityId", "changes", "ipAddress", "userAgent", "createdAt")
      VALUES (
        gen_random_uuid(),
        ${householdId ? householdId : null}::uuid,
        ${user.id}::uuid,
        ${action}::"AuditAction",
        ${model},
        ${entityId}::uuid,
        ${JSON.stringify(changes)}::jsonb,
        ${cls.get('ipAddress') || null},
        ${cls.get('userAgent') || null},
        NOW()
      )
    `;
  } catch (error) {
    console.error('Failed to write audit log', error);
  }
}
