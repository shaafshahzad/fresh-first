import { getSql } from "../../../db";
import { getOrCreateDefaultFridge } from "../../../db/fridges";
import {
  isHeaderWidgetId,
  resolveDisplayHeader,
  type DisplayHeaderSettings,
  type DisplayWidgetContext,
} from "../../../lib/display-widgets";
import { getRequestSession, unauthorized } from "../../../lib/server-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WidgetSummaryRow = {
  item_count: number | string;
  attention_count: number | string;
  next_item_name: string | null;
};

async function widgetContext(fridgeId: string, fridgeName: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT
      COUNT(*) AS item_count,
      COUNT(*) FILTER (WHERE expires_on <= CURRENT_DATE + 5) AS attention_count,
      (ARRAY_AGG(name ORDER BY expires_on ASC, LOWER(name) ASC, id ASC))[1]
        AS next_item_name
    FROM fridge_items
    WHERE fridge_id = ${fridgeId} AND status = 'active'
  ` as WidgetSummaryRow[];
  const row = rows[0];
  return {
    fridgeName,
    itemCount: Number(row?.item_count ?? 0),
    attentionCount: Number(row?.attention_count ?? 0),
    nextItemName: row?.next_item_name ?? null,
  } satisfies DisplayWidgetContext;
}

function responseBody(
  fridge: Awaited<ReturnType<typeof getOrCreateDefaultFridge>>,
  context: DisplayWidgetContext,
) {
  return {
    fridge: { id: fridge.id, name: fridge.name },
    header: fridge.displayHeader,
    resolvedHeader: resolveDisplayHeader(fridge.displayHeader, context),
    context,
  };
}

export async function GET(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const context = await widgetContext(fridge.id, fridge.name);
    return Response.json(responseBody(fridge, context), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Display settings read failed", error);
    return Response.json({ error: "Could not load display settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getRequestSession(request);
    if (!session) return unauthorized();
    const payload = await request.json() as Partial<DisplayHeaderSettings>;
    if (!isHeaderWidgetId(payload.left) || !isHeaderWidgetId(payload.right)) {
      return Response.json({ error: "Choose a valid widget for both header positions." }, { status: 400 });
    }

    const fridge = await getOrCreateDefaultFridge(session.user.id, session.user.name);
    const sql = getSql();
    await sql`
      UPDATE fridges
      SET header_left_widget = ${payload.left},
          header_right_widget = ${payload.right}
      WHERE id = ${fridge.id} AND owner_user_id = ${session.user.id}
    `;
    const updated = {
      ...fridge,
      displayHeader: { left: payload.left, right: payload.right },
    };
    const context = await widgetContext(updated.id, updated.name);
    return Response.json(responseBody(updated, context));
  } catch (error) {
    console.error("Display settings update failed", error);
    return Response.json({ error: "Could not save display settings." }, { status: 500 });
  }
}
