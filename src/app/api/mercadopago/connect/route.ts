import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { env } from "~/env";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (!env.MP_CLIENT_ID || !env.NEXT_PUBLIC_BASE_URL) {
    return new Response("MP_CLIENT_ID o NEXT_PUBLIC_BASE_URL no configurados", { status: 500 });
  }

  const callbackUrl = `${env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/connect/callback`;

  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", env.MP_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", callbackUrl);

  redirect(url.toString());
}
