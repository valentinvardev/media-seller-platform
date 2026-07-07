import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

export const memberRouter = createTRPCRouter({
  /** List all confirmed members of a collection (accepted invitations). */
  listForCollection: adminProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const members = await ctx.db.collectionMember.findMany({
        where: { collectionId: input.collectionId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      return members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        joinedAt: m.createdAt,
      }));
    }),

  /** Remove a collaborator from a collection. Does NOT delete their photos. */
  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.collectionMember.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
