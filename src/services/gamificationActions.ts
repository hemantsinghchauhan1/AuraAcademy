"use server";

import * as gamificationService from "./gamificationService";
import { revalidatePath } from "next/cache";

export async function earnXpAction(userId: string, amount: number, reason: string) {
  try {
    const res = await gamificationService.earnXp(userId, amount, reason);
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reward XP." };
  }
}

export async function getUserGamificationProfileAction(userId: string) {
  try {
    const data = await gamificationService.getUserGamificationProfile(userId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch gamification profile." };
  }
}

export async function getDailyMissionsAction(userId: string) {
  try {
    const data = await gamificationService.getDailyMissions(userId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load daily missions." };
  }
}

export async function claimMissionRewardAction(userId: string, userMissionId: string) {
  try {
    const res = await gamificationService.claimMissionReward(userId, userMissionId);
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to claim mission reward." };
  }
}

export async function getLeaderboardStandingsAction(filterType: gamificationService.LeaderboardFilter = "xp") {
  try {
    const data = await gamificationService.getLeaderboardStandings(filterType);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch leaderboard standings." };
  }
}

export async function getOrCreateCertificateAction(userId: string, courseId: string) {
  try {
    const data = await gamificationService.getOrCreateCertificate(userId, courseId);
    if (!data) return { success: false, error: "Failed to issue certificate." };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to issue certificate." };
  }
}

export async function verifyCertificateAction(code: string) {
  try {
    const data = await gamificationService.verifyCertificate(code);
    if (!data) return { success: false, error: "Certificate verification failed. Code is invalid or expired." };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to verify certificate." };
  }
}
