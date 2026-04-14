import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { collectionRouter } from "~/server/api/routers/collection";
import { photoRouter } from "~/server/api/routers/photo";
import { purchaseRouter } from "~/server/api/routers/purchase";
import { settingsRouter } from "~/server/api/routers/settings";

export const appRouter = createTRPCRouter({
  collection: collectionRouter,
  photo: photoRouter,
  purchase: purchaseRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
