import { NextRequest, NextResponse } from "next/server";
import { isSaasEnabled, isFeatureEnabled } from "@/lib/config";

/**
 * Teams API route handler
 * This conditionally uses the SAAS implementation if enabled
 */
export async function GET(request: NextRequest) {
  // If SAAS is enabled and teams feature is enabled, use SAAS implementation
  if (isSaasEnabled && isFeatureEnabled("teams")) {
    // Dynamically import the SAAS implementation
    const { GET: saasGetHandler } = await import("@/saas/api/team-api");
    return saasGetHandler(request);
  }

  // Open source implementation (feature not available)
  return NextResponse.json(
    { error: "Teams feature is only available in the SAAS version" },
    { status: 404 }
  );
}

export async function POST(request: NextRequest) {
  // If SAAS is enabled and teams feature is enabled, use SAAS implementation
  if (isSaasEnabled && isFeatureEnabled("teams")) {
    // Dynamically import the SAAS implementation
    const { POST: saasPostHandler } = await import("@/saas/api/team-api");
    return saasPostHandler(request);
  }

  // Open source implementation (feature not available)
  return NextResponse.json(
    { error: "Teams feature is only available in the SAAS version" },
    { status: 404 }
  );
}
