/**
 * Script para probar los endpoints ADHD
 *
 * Uso: npx tsx scripts/test-adhd-api.ts
 *
 * IMPORTANTE: Primero debes estar autenticado en el navegador en localhost:3002
 * y copiar la cookie de sesión aquí abajo.
 */

const BASE_URL = "http://localhost:3002";

async function testAPI() {
  console.log("🧪 Testing ADHD API Endpoints\n");

  // Test 1: Create a habit
  console.log("1️⃣ Creating a habit...");
  try {
    const habitResponse = await fetch(`${BASE_URL}/api/adhd/habits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Meditación matutina",
        description: "10 minutos de meditación al despertar",
        icon: "🧘",
        color: "#4F46E5",
        frequency: "daily",
        reminderEnabled: true,
        reminderTime: "08:00",
      }),
    });

    if (habitResponse.ok) {
      const habit = await habitResponse.json();
      console.log("✅ Habit created:", habit.id, "-", habit.name);

      // Test 2: Log habit completion
      console.log("\n2️⃣ Logging habit completion...");
      const logResponse = await fetch(`${BASE_URL}/api/adhd/habits/${habit.id}/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: "Me sentí muy bien después de meditar",
          mood: "positive",
        }),
      });

      if (logResponse.ok) {
        const log = await logResponse.json();
        console.log("✅ Habit logged:", log.id);
      } else {
        console.log("❌ Failed to log habit:", logResponse.status);
      }
    } else {
      console.log("❌ Failed to create habit:", habitResponse.status);
      const error = await habitResponse.text();
      console.log("Error:", error);
    }
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }

  // Test 3: Create mood entry
  console.log("\n3️⃣ Creating mood entry...");
  try {
    const moodResponse = await fetch(`${BASE_URL}/api/adhd/mood`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mood: "positive",
        energyLevel: "high",
        focus: 8,
        anxiety: 2,
        note: "Día productivo, me siento con energía",
        tags: "trabajo,ejercicio",
      }),
    });

    if (moodResponse.ok) {
      const mood = await moodResponse.json();
      console.log("✅ Mood entry created:", mood.id);
    } else {
      console.log("❌ Failed to create mood:", moodResponse.status);
    }
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }

  // Test 4: Start Pomodoro session
  console.log("\n4️⃣ Starting Pomodoro session...");
  try {
    const pomodoroResponse = await fetch(`${BASE_URL}/api/adhd/pomodoro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workDuration: 25,
        breakDuration: 5,
        type: "work",
      }),
    });

    if (pomodoroResponse.ok) {
      const session = await pomodoroResponse.json();
      console.log("✅ Pomodoro session started:", session.id);

      // Complete the session
      console.log("\n5️⃣ Completing Pomodoro session...");
      const completeResponse = await fetch(
        `${BASE_URL}/api/adhd/pomodoro/${session.id}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (completeResponse.ok) {
        console.log("✅ Pomodoro session completed");
      } else {
        console.log("❌ Failed to complete session:", completeResponse.status);
      }
    } else {
      console.log("❌ Failed to start Pomodoro:", pomodoroResponse.status);
    }
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }

  // Test 6: Get all habits
  console.log("\n6️⃣ Fetching all habits...");
  try {
    const habitsResponse = await fetch(`${BASE_URL}/api/adhd/habits`);
    if (habitsResponse.ok) {
      const habits = await habitsResponse.json();
      console.log(`✅ Found ${habits.length} habit(s)`);
      habits.forEach((h: any) => {
        console.log(`  - ${h.icon} ${h.name} (Streak: ${h.currentStreak})`);
      });
    } else {
      console.log("❌ Failed to fetch habits:", habitsResponse.status);
    }
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n✨ Test complete!");
}

testAPI();
