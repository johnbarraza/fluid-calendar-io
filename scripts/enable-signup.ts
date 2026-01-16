/**
 * Quick script to enable public signup
 * Run with: npx tsx scripts/enable-signup.ts
 */

import { db, systemSettings } from "../src/db";
import { eq } from "drizzle-orm";

async function enablePublicSignup() {
    console.log("Enabling public signup...");

    try {
        // Check if systemSettings exists
        const settings = await db.query.systemSettings.findFirst();

        if (!settings) {
            // Create a new record with publicSignup enabled
            console.log("No system settings found, creating new record...");
            await db.insert(systemSettings).values({
                id: crypto.randomUUID(),
                publicSignup: true,
            });
            console.log("Created system settings with public signup enabled!");
        } else {
            // Update existing record
            console.log("Updating existing system settings...");
            await db.update(systemSettings)
                .set({ publicSignup: true, updatedAt: new Date() })
                .where(eq(systemSettings.id, settings.id));
            console.log("Updated system settings - public signup is now enabled!");
        }

        // Verify
        const updated = await db.query.systemSettings.findFirst();
        console.log("Current publicSignup value:", updated?.publicSignup);

    } catch (error) {
        console.error("Error enabling public signup:", error);
        process.exit(1);
    }

    process.exit(0);
}

enablePublicSignup();
