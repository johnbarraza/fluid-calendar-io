import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load .env.local file
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function configureIntegrations() {
  // Get credentials from environment variables
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const outlookClientId = process.env.AZURE_AD_CLIENT_ID;
  const outlookClientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const outlookTenantId = process.env.AZURE_AD_TENANT_ID || "common";

  try {
    // Check if SystemSettings exists
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      // Update existing settings
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          googleClientId: googleClientId || settings.googleClientId,
          googleClientSecret:
            googleClientSecret || settings.googleClientSecret,
          outlookClientId: outlookClientId || settings.outlookClientId,
          outlookClientSecret:
            outlookClientSecret || settings.outlookClientSecret,
          outlookTenantId: outlookTenantId || settings.outlookTenantId,
          publicSignup: true, // Enable public signup
        },
      });
      console.log("✅ SystemSettings updated successfully!");
    } else {
      // Create new settings
      settings = await prisma.systemSettings.create({
        data: {
          googleClientId,
          googleClientSecret,
          outlookClientId,
          outlookClientSecret,
          outlookTenantId,
          publicSignup: true, // Enable public signup
        },
      });
      console.log("✅ SystemSettings created successfully!");
    }

    console.log("\n📊 Integration Status:");
    console.log(
      "  🟢 Google Calendar:",
      googleClientId && googleClientSecret ? "Configured" : "Not configured"
    );
    console.log(
      "  🟡 Outlook Calendar:",
      outlookClientId && outlookClientSecret
        ? "Configured"
        : "Not configured (optional)"
    );

    console.log("\n🔄 Reload the page in your browser to see the changes.");
  } catch (error: any) {
    console.error("❌ Error configuring integrations:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

configureIntegrations();
