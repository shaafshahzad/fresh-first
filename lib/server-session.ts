import { auth } from "./auth";

export async function getRequestSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export function unauthorized() {
  return Response.json(
    { error: "Sign in to continue." },
    { status: 401 },
  );
}
