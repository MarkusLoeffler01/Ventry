import { type NextRequest, NextResponse } from "next/server";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Giphy not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 25);

  try {
    const gf = new GiphyFetch(apiKey);
    const { data } = q
      ? await gf.search(q, { limit, rating: "g" })
      : await gf.trending({ limit, rating: "g" });
    return NextResponse.json({ gifs: data }, { status: 200 });
  } catch (error) {
    console.error("Giphy search error:", error);
    return NextResponse.json({ error: "Giphy search failed" }, { status: 502 });
  }
}
