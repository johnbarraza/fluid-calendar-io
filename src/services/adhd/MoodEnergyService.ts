import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { MoodEntry } from "@prisma/client"

const LOG_SOURCE = "MoodEnergyService"

export interface MoodEntryInput {
  mood: string // "very_positive", "positive", "neutral", "negative", "very_negative"
  energyLevel: string // "high", "medium", "low"
  focus?: number // 1-10 scale
  anxiety?: number // 1-10 scale
  note?: string
  tags?: string[]
}

export interface MoodPattern {
  averageMood: number // -2 to 2 (very_negative to very_positive)
  averageEnergy: number // 1 to 3 (low to high)
  averageFocus: number // 1-10 scale
  averageAnxiety: number // 1-10 scale
  trendDirection: "improving" | "declining" | "stable"
  commonTags: string[]
  daysAnalyzed: number
}

export interface TimeEnergyMap {
  [hour: number]: {
    averageEnergy: number
    sampleCount: number
  }
}

export interface TimeSlot {
  startHour: number
  endHour: number
  averageEnergy: number
  label: string // e.g., "9am-11am (High Energy)"
}

export interface MoodAnomaly {
  type: "consecutive_low_mood" | "sudden_drop" | "high_anxiety_spike"
  startDate: Date
  endDate?: Date
  description: string
  severity: "low" | "medium" | "high"
}

export class MoodEnergyService {
  /**
   * Map mood string to numeric value for calculations
   */
  private moodToNumber(mood: string): number {
    const moodMap: Record<string, number> = {
      very_negative: -2,
      negative: -1,
      neutral: 0,
      positive: 1,
      very_positive: 2,
    }
    return moodMap[mood] || 0
  }

  /**
   * Map energy level string to numeric value
   */
  private energyToNumber(energy: string): number {
    const energyMap: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
    }
    return energyMap[energy] || 2
  }

  /**
   * Log a mood/energy entry
   */
  async logMoodEntry(
    userId: string,
    data: MoodEntryInput
  ): Promise<MoodEntry> {
    logger.info("Logging mood entry", { userId }, LOG_SOURCE)

    try {
      const moodEntry = await prisma.moodEntry.create({
        data: {
          userId,
          mood: data.mood,
          energyLevel: data.energyLevel,
          focus: data.focus,
          anxiety: data.anxiety,
          note: data.note,
          tags: data.tags ? JSON.stringify(data.tags) : null,
        },
      })

      logger.info("Mood entry logged successfully", { userId }, LOG_SOURCE)
      return moodEntry
    } catch (error) {
      logger.error(
        "Failed to log mood entry",
        { userId, error: String(error) },
        LOG_SOURCE
      )
      throw error
    }
  }

  /**
   * Get mood pattern for a user over a specified number of days
   */
  async getMoodPattern(
    userId: string,
    days: number = 30
  ): Promise<MoodPattern> {
    logger.info("Analyzing mood pattern", { userId, days }, LOG_SOURCE)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const entries = await prisma.moodEntry.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    })

    if (entries.length === 0) {
      return {
        averageMood: 0,
        averageEnergy: 2,
        averageFocus: 5,
        averageAnxiety: 5,
        trendDirection: "stable",
        commonTags: [],
        daysAnalyzed: 0,
      }
    }

    // Calculate averages
    const moodValues = entries.map((e) => this.moodToNumber(e.mood))
    const energyValues = entries.map((e) => this.energyToNumber(e.energyLevel))
    const focusValues = entries
      .filter((e) => e.focus !== null)
      .map((e) => e.focus!)
    const anxietyValues = entries
      .filter((e) => e.anxiety !== null)
      .map((e) => e.anxiety!)

    const averageMood = moodValues.reduce((a, b) => a + b, 0) / moodValues.length
    const averageEnergy =
      energyValues.reduce((a, b) => a + b, 0) / energyValues.length
    const averageFocus =
      focusValues.length > 0
        ? focusValues.reduce((a, b) => a + b, 0) / focusValues.length
        : 5
    const averageAnxiety =
      anxietyValues.length > 0
        ? anxietyValues.reduce((a, b) => a + b, 0) / anxietyValues.length
        : 5

    // Calculate trend direction (compare first half vs second half)
    const midpoint = Math.floor(moodValues.length / 2)
    const firstHalfAvg =
      moodValues.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint
    const secondHalfAvg =
      moodValues.slice(midpoint).reduce((a, b) => a + b, 0) /
      (moodValues.length - midpoint)

    let trendDirection: "improving" | "declining" | "stable" = "stable"
    const difference = secondHalfAvg - firstHalfAvg
    if (difference > 0.3) trendDirection = "improving"
    else if (difference < -0.3) trendDirection = "declining"

    // Extract common tags
    const allTags: string[] = []
    entries.forEach((entry) => {
      if (entry.tags) {
        try {
          const tags = JSON.parse(entry.tags)
          allTags.push(...tags)
        } catch (e) {
          // Ignore parsing errors
        }
      }
    })

    const tagCounts: Record<string, number> = {}
    allTags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })

    const commonTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag)

    return {
      averageMood: Math.round(averageMood * 100) / 100,
      averageEnergy: Math.round(averageEnergy * 100) / 100,
      averageFocus: Math.round(averageFocus * 100) / 100,
      averageAnxiety: Math.round(averageAnxiety * 100) / 100,
      trendDirection,
      commonTags,
      daysAnalyzed: entries.length,
    }
  }

  /**
   * Get energy levels mapped by hour of day
   */
  async getEnergyPattern(userId: string): Promise<TimeEnergyMap> {
    logger.info("Analyzing energy pattern by time", { userId }, LOG_SOURCE)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Last 30 days

    const entries = await prisma.moodEntry.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
        },
      },
    })

    const hourlyData: TimeEnergyMap = {}

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour] = {
        averageEnergy: 0,
        sampleCount: 0,
      }
    }

    // Group entries by hour and calculate average energy
    entries.forEach((entry) => {
      const hour = entry.timestamp.getHours()
      const energyValue = this.energyToNumber(entry.energyLevel)

      hourlyData[hour].averageEnergy += energyValue
      hourlyData[hour].sampleCount++
    })

    // Calculate averages
    Object.keys(hourlyData).forEach((hourStr) => {
      const hour = parseInt(hourStr)
      const data = hourlyData[hour]
      if (data.sampleCount > 0) {
        data.averageEnergy = data.averageEnergy / data.sampleCount
      } else {
        // Default to medium energy if no data
        data.averageEnergy = 2
      }
    })

    return hourlyData
  }

  /**
   * Get recommended work times based on energy patterns
   */
  async getBestWorkTimes(userId: string): Promise<TimeSlot[]> {
    logger.info("Calculating best work times", { userId }, LOG_SOURCE)

    const energyPattern = await this.getEnergyPattern(userId)

    // Find continuous blocks of high energy (>= 2.5)
    const highEnergyBlocks: TimeSlot[] = []
    let currentBlock: TimeSlot | null = null

    for (let hour = 0; hour < 24; hour++) {
      const energyData = energyPattern[hour]
      const isHighEnergy = energyData.averageEnergy >= 2.5

      if (isHighEnergy) {
        if (!currentBlock) {
          // Start new block
          currentBlock = {
            startHour: hour,
            endHour: hour,
            averageEnergy: energyData.averageEnergy,
            label: "",
          }
        } else {
          // Extend current block
          currentBlock.endHour = hour
          // Update average energy
          const blockSize = currentBlock.endHour - currentBlock.startHour + 1
          currentBlock.averageEnergy =
            (currentBlock.averageEnergy * (blockSize - 1) +
              energyData.averageEnergy) /
            blockSize
        }
      } else {
        if (currentBlock) {
          // End current block
          currentBlock.label = this.formatTimeSlotLabel(currentBlock)
          highEnergyBlocks.push(currentBlock)
          currentBlock = null
        }
      }
    }

    // Don't forget the last block if it extends to end of day
    if (currentBlock) {
      currentBlock.label = this.formatTimeSlotLabel(currentBlock)
      highEnergyBlocks.push(currentBlock)
    }

    // Sort by average energy descending
    return highEnergyBlocks.sort((a, b) => b.averageEnergy - a.averageEnergy)
  }

  /**
   * Format time slot label
   */
  private formatTimeSlotLabel(slot: TimeSlot): string {
    const startLabel = this.formatHour(slot.startHour)
    const endLabel = this.formatHour(slot.endHour + 1) // +1 to include the end hour
    const energyLevel =
      slot.averageEnergy >= 2.7
        ? "High Energy"
        : slot.averageEnergy >= 2.3
        ? "Good Energy"
        : "Moderate Energy"
    return `${startLabel}-${endLabel} (${energyLevel})`
  }

  /**
   * Format hour to 12-hour format
   */
  private formatHour(hour: number): string {
    if (hour === 0) return "12am"
    if (hour === 12) return "12pm"
    if (hour < 12) return `${hour}am`
    return `${hour - 12}pm`
  }

  /**
   * Detect mood/energy anomalies that might indicate burnout or issues
   */
  async detectAnomalies(userId: string): Promise<MoodAnomaly[]> {
    logger.info("Detecting mood anomalies", { userId }, LOG_SOURCE)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const entries = await prisma.moodEntry.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    })

    const anomalies: MoodAnomaly[] = []

    // Check for consecutive low mood days
    let consecutiveLowMoodCount = 0
    let lowMoodStart: Date | null = null

    for (const entry of entries) {
      const moodValue = this.moodToNumber(entry.mood)

      if (moodValue <= -1) {
        // Negative or very negative
        if (consecutiveLowMoodCount === 0) {
          lowMoodStart = entry.timestamp
        }
        consecutiveLowMoodCount++
      } else {
        if (consecutiveLowMoodCount >= 3 && lowMoodStart) {
          anomalies.push({
            type: "consecutive_low_mood",
            startDate: lowMoodStart,
            endDate: entries[entries.indexOf(entry) - 1]?.timestamp,
            description: `${consecutiveLowMoodCount} consecutive days of low mood`,
            severity: consecutiveLowMoodCount >= 7 ? "high" : "medium",
          })
        }
        consecutiveLowMoodCount = 0
        lowMoodStart = null
      }
    }

    // Don't forget to check if we ended on a low mood streak
    if (consecutiveLowMoodCount >= 3 && lowMoodStart) {
      anomalies.push({
        type: "consecutive_low_mood",
        startDate: lowMoodStart,
        endDate: entries[entries.length - 1]?.timestamp,
        description: `${consecutiveLowMoodCount} consecutive days of low mood (ongoing)`,
        severity: consecutiveLowMoodCount >= 7 ? "high" : "medium",
      })
    }

    // Check for sudden mood drops
    for (let i = 1; i < entries.length; i++) {
      const currentMood = this.moodToNumber(entries[i].mood)
      const previousMood = this.moodToNumber(entries[i - 1].mood)
      const drop = previousMood - currentMood

      if (drop >= 2) {
        // Dropped at least 2 levels
        anomalies.push({
          type: "sudden_drop",
          startDate: entries[i].timestamp,
          description: `Sudden mood drop from ${entries[i - 1].mood} to ${
            entries[i].mood
          }`,
          severity: drop >= 3 ? "high" : "medium",
        })
      }
    }

    // Check for high anxiety spikes
    for (const entry of entries) {
      if (entry.anxiety !== null && entry.anxiety >= 8) {
        anomalies.push({
          type: "high_anxiety_spike",
          startDate: entry.timestamp,
          description: `High anxiety level: ${entry.anxiety}/10`,
          severity: entry.anxiety >= 9 ? "high" : "medium",
        })
      }
    }

    return anomalies
  }

  /**
   * Get mood entries for a specific date range
   */
  async getMoodEntries(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MoodEntry[]> {
    logger.info(
      "Fetching mood entries",
      { userId, startDate, endDate },
      LOG_SOURCE
    )

    return prisma.moodEntry.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    })
  }

  /**
   * Delete a mood entry
   */
  async deleteMoodEntry(entryId: string, userId: string): Promise<void> {
    logger.info("Deleting mood entry", { entryId, userId }, LOG_SOURCE)

    await prisma.moodEntry.delete({
      where: {
        id: entryId,
        userId, // Ensure user owns this entry
      },
    })
  }
}
