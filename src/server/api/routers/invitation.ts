import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { env } from "~/env";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

const INVITATION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/** Random URL-safe token — 32 chars, plenty of entropy. */
function makeToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export const invitationRouter = createTRPCRouter({
  // ─── Admin ─────────────────────────────────────────────────────────────────

  /** Create a fresh invitation for an email + event. Fires the email in the background. */
  create: adminProcedure
    .input(
      z.object({
        collectionId: z.string(),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId },
        select: { id: true, title: true },
      });
      if (!collection) throw new TRPCError({ code: "NOT_FOUND", message: "Evento no encontrado" });

      // If the invitee already has a User account AND is already a member of this
      // event, just return the existing membership — no need to invite again.
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existingUser) {
        const existingMember = await ctx.db.collectionMember.findUnique({
          where: { userId_collectionId: { userId: existingUser.id, collectionId: input.collectionId } },
        });
        if (existingMember) {
          throw new TRPCError({ code: "CONFLICT", message: "Ese email ya es colaborador de este evento" });
        }
      }

      // Invalidate any prior pending invitation to the same email for the same event.
      await ctx.db.invitation.deleteMany({
        where: {
          email: input.email,
          collectionId: input.collectionId,
          acceptedAt: null,
        },
      });

      const token = makeToken();
      const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);

      const invitation = await ctx.db.invitation.create({
        data: {
          email: input.email,
          token,
          collectionId: input.collectionId,
          invitedById: ctx.session.user.id,
          expiresAt,
        },
      });

      const acceptUrl = `${env.NEXT_PUBLIC_BASE_URL ?? ""}/invitar/${token}`;

      // Fire-and-forget email. If email fails, admin still has the copyable link.
      void (async () => {
        try {
          const { sendCollaboratorInvitationEmail } = await import("~/lib/email");
          await sendCollaboratorInvitationEmail({
            to: input.email,
            eventTitle: collection.title,
            inviterName: ctx.session.user.name ?? null,
            acceptUrl,
            expiresAt,
          });
        } catch (err) {
          console.error("[invitation] email send failed:", err);
        }
      })();

      return {
        id: invitation.id,
        token,
        acceptUrl,
        expiresAt,
        email: input.email,
      };
    }),

  /** Delete a pending invitation (revoke). Doesn't remove existing members. */
  revoke: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.invitation.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /** All pending (not-accepted, not-expired) invitations for an event. */
  listForCollection: adminProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      return ctx.db.invitation.findMany({
        where: {
          collectionId: input.collectionId,
          acceptedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, token: true, expiresAt: true, createdAt: true,
        },
      });
    }),

  // ─── Public — invite acceptance flow ───────────────────────────────────────

  /**
   * Public lookup: given a token, tells the invitar page what to render.
   * Returns the invitation details or a reason it can't be used.
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        include: {
          collection: { select: { title: true, slug: true } },
          invitedBy: { select: { name: true, email: true } },
        },
      });
      if (!invitation) return { status: "not-found" as const };
      if (invitation.acceptedAt) return { status: "already-accepted" as const };
      if (invitation.expiresAt < new Date()) return { status: "expired" as const };

      // Check if a user with this email already has an account — the page will
      // show a login prompt instead of a signup form.
      const existingUser = await ctx.db.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      });

      return {
        status: "valid" as const,
        email: invitation.email,
        eventTitle: invitation.collection.title,
        eventSlug: invitation.collection.slug,
        collectionId: invitation.collectionId,
        inviterName: invitation.invitedBy.name ?? invitation.invitedBy.email,
        expiresAt: invitation.expiresAt,
        hasAccount: !!existingUser,
      };
    }),

  /**
   * Accept an invitation. Two flows:
   * - Signed-in user: creates the CollectionMember for their existing account.
   * - Not signed-in: caller provides { name, password } → we create the User
   *   account (email fixed from the invitation) and the CollectionMember.
   * Returns the collectionId so the client can redirect.
   */
  accept: publicProcedure
    .input(
      z.object({
        token: z.string(),
        signup: z
          .object({
            name: z.string().min(1),
            password: z.string().min(6),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
      });
      if (!invitation) throw new TRPCError({ code: "NOT_FOUND", message: "Invitación no encontrada" });
      if (invitation.acceptedAt) throw new TRPCError({ code: "CONFLICT", message: "Esta invitación ya fue usada" });
      if (invitation.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta invitación expiró" });

      // Resolve the user: either the already-signed-in one, or create a new one
      // from the signup payload.
      let userId: string;

      if (ctx.session?.user) {
        // Signed-in path — email must match to prevent hijacking.
        const currentUser = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { id: true, email: true },
        });
        if (!currentUser) throw new TRPCError({ code: "UNAUTHORIZED" });
        if (currentUser.email?.toLowerCase() !== invitation.email.toLowerCase()) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Esta invitación es para ${invitation.email}. Cerrá sesión e iniciá con esa cuenta.`,
          });
        }
        userId = currentUser.id;
      } else {
        // Signup path — need name + password.
        if (!input.signup) throw new TRPCError({ code: "BAD_REQUEST", message: "Faltan datos para crear la cuenta" });

        // Race guard: if someone signed up in the meantime, reuse their account.
        const existing = await ctx.db.user.findUnique({
          where: { email: invitation.email },
          select: { id: true },
        });
        if (existing) {
          userId = existing.id;
        } else {
          const passwordHash = await bcrypt.hash(input.signup.password, 10);
          const created = await ctx.db.user.create({
            data: {
              email: invitation.email,
              name: input.signup.name,
              passwordHash,
              role: "COLLABORATOR",
            },
            select: { id: true },
          });
          userId = created.id;
        }
      }

      // Idempotent: use upsert so a double-click doesn't crash.
      await ctx.db.collectionMember.upsert({
        where: { userId_collectionId: { userId, collectionId: invitation.collectionId } },
        create: {
          userId,
          collectionId: invitation.collectionId,
          role: "PHOTOGRAPHER",
        },
        update: {},
      });

      await ctx.db.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), acceptedByUserId: userId },
      });

      return { collectionId: invitation.collectionId, userId };
    }),
});
