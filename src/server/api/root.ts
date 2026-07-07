import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { collectionRouter } from "~/server/api/routers/collection";
import { photoRouter } from "~/server/api/routers/photo";
import { purchaseRouter } from "~/server/api/routers/purchase";
import { settingsRouter } from "~/server/api/routers/settings";
import { faceRouter } from "~/server/api/routers/face";
import { invitationRouter } from "~/server/api/routers/invitation";
import { collaboratorRouter } from "~/server/api/routers/collaborator";
import { memberRouter } from "~/server/api/routers/member";

export const appRouter = createTRPCRouter({
  collection: collectionRouter,
  photo: photoRouter,
  purchase: purchaseRouter,
  settings: settingsRouter,
  face: faceRouter,
  invitation: invitationRouter,
  collaborator: collaboratorRouter,
  member: memberRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
