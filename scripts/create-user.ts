import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function createUser() {
  const email = "test@example.com";
  const password = "password123";
  const name = "Test User";

  try {
    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user with credentials account
    const user = await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: new Date(), // Mark as verified
        role: "ADMIN", // Admin role for full access
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: email, // Use email as provider account ID
            id_token: hashedPassword, // Store password hash in id_token field
          },
        },
      },
    });

    console.log("✅ User created successfully!");
    console.log("📧 Email:", email);
    console.log("🔑 Password:", password);
    console.log("👤 User ID:", user.id);
    console.log("\nYou can now sign in with these credentials at http://localhost:3001");
  } catch (error: any) {
    if (error.code === "P2002") {
      console.log("⚠️  User already exists with this email.");
      console.log("Try signing in with: test@example.com / password123");
    } else {
      console.error("❌ Error creating user:", error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
