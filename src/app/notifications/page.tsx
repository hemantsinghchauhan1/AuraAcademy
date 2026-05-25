import { ensureDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { 
  getNotificationsWorkspace, 
  getAcademicReminders, 
  getNotificationPreferences 
} from "@/services/notificationService";
import NotificationsClient from "./NotificationsClient";
import React from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationsPage() {
  // 1. Ensure Clerk Auth & DB profile
  const user = await ensureDbUser();
  if (!user) {
    redirect("/sign-in");
  }

  // 2. Enforce onboarding gate
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  // 3. Parallel fetch notification center datasets
  const [notifsRes, remindersRes, prefsRes] = await Promise.all([
    getNotificationsWorkspace(user.id),
    getAcademicReminders(user.id),
    getNotificationPreferences(user.id),
  ]);

  const initialNotifications = notifsRes.success ? notifsRes.notifications || [] : [];
  const initialUnreadCount = notifsRes.success ? notifsRes.unreadCount ?? 0 : 0;
  const initialReminders = remindersRes.success ? remindersRes.reminders || [] : [];
  const initialPreferences = prefsRes.success ? prefsRes.preferences || null : null;

  return (
    <div className="min-h-screen bg-[#040406]">
      <NotificationsClient
        currentUser={{
          id: user.id,
          email: user.email,
          role: user.role,
          name: (user as any).profile?.name || "Student",
          avatarUrl: (user as any).profile?.avatarUrl || null,
          isOfficialIITM: user.isOfficialIITM,
        }}
        initialNotifications={initialNotifications}
        initialUnreadCount={initialUnreadCount}
        initialReminders={initialReminders}
        initialPreferences={initialPreferences}
      />
    </div>
  );
}
