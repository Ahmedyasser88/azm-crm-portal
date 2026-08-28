import { NextResponse } from "next/server";
import { apiServerFetch } from "@/lib/api/fetch";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;

  const result = await apiServerFetch<string>({
    url: `/api/customers/${id}/attachments/${attachmentId}/download`,
    responseType: "arrayBuffer",
    cache: "no-store",
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  const bytes = Buffer.from(result.data, "base64");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment",
    },
  });
}
