import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
  getMpStatus: protectedProcedure.query(async ({ ctx }) => {
    const setting = await ctx.db.setting.findUnique({
      where: { key: "mp_access_token" },
    });
    const userId = await ctx.db.setting.findUnique({
      where: { key: "mp_user_id" },
    });
    return {
      connected: !!setting?.value,
      userId: userId?.value ?? null,
    };
  }),

  disconnectMp: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.setting.deleteMany({
      where: { key: { in: ["mp_access_token", "mp_refresh_token", "mp_user_id"] } },
    });
    return { ok: true };
  }),
});
