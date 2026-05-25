import { getCoursesList, getStudentEnrollments } from "@/services/courseService";
import { getDbUser } from "@/lib/auth";
import React from "react";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const dbUser = await getDbUser();
  const allCourses = await getCoursesList();

  let enrolledCourses: any[] = [];
  if (dbUser) {
    enrolledCourses = await getStudentEnrollments(dbUser.id);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Platform Title */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Classrooms & Tracks</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Syllabus & Structured Learning</h1>
        <p className="text-gray-400 mt-1 max-w-2xl">
          Structured modules, video classrooms, and downloadable task files tailored for IITM and placement preparatives.
        </p>
      </div>

      {/* Enrolled Tracks Panel (Conditional) */}
      {dbUser && enrolledCourses.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span>Your Enrolled Curriculum</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((e) => {
              return (
                <div key={e.id} className="glass-panel p-5 rounded-xl border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                  <div className="space-y-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono uppercase ${e.isPremium ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                      {e.isPremium ? "Premium Track" : "Free Track"}
                    </span>
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-1">{e.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{e.description}</p>
                  </div>

                  {/* Progress tracker bar */}
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <div className="flex justify-between font-medium">
                      <span>Progress: {e.progressPercentage}%</span>
                      <span>{e.completedLessons} / {e.totalLessons} Lessons</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${e.progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <a
                    href={`/courses/${e.slug}`}
                    className="flex justify-center items-center w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-900/10 transition-all cursor-pointer"
                  >
                    Continue Studying
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discovery Catalog Grid */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
          <span>Explore All Syllabus Tracks</span>
        </h2>

        {allCourses.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-xl border border-white/5 text-gray-500 text-sm">
            No courses are currently published. Curriculum drafts are pending administrator upload!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCourses.map((c) => {
              const isEnrolled = enrolledCourses.some((e) => e.courseId === c.id);
              const ratingSum = c.reviews.reduce((sum, r) => sum + r.rating, 0);
              const avgRating = c.reviews.length > 0 ? (ratingSum / c.reviews.length).toFixed(1) : "NEW";

              return (
                <div key={c.id} className="glass-panel rounded-xl overflow-hidden border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors">
                  {/* Thumbnail / Header block */}
                  <div className="aspect-video bg-gradient-to-tr from-indigo-950/40 to-purple-950/20 relative p-5 flex flex-col justify-between border-b border-white/5">
                    {c.thumbnailUrl ? (
                      <img src={c.thumbnailUrl} alt={c.title} className="absolute inset-0 h-full w-full object-cover opacity-30" />
                    ) : (
                      <div className="absolute inset-0 bg-indigo-500/5"></div>
                    )}
                    <div className="flex justify-between items-start z-10">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono uppercase ${c.isPremium ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                        {c.isPremium ? "Premium" : "Free"}
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10 flex items-center space-x-1">
                        <span>★</span>
                        <span>{avgRating}</span>
                      </span>
                    </div>

                    <div className="z-10">
                      <h4 className="text-base font-extrabold text-white leading-tight mt-2">{c.title}</h4>
                    </div>
                  </div>

                  {/* Body description & details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{c.description}</p>

                    <div className="flex items-center space-x-4 text-[11px] text-gray-500 border-t border-white/5 pt-3">
                      <span>Modules: <span className="text-gray-300 font-medium">{c.modules.length}</span></span>
                      <span>Enrolled: <span className="text-gray-300 font-medium">{c.enrollments.length}</span></span>
                    </div>

                    <a
                      href={`/courses/${c.slug}`}
                      className={`flex justify-center items-center w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${isEnrolled ? "bg-white/5 hover:bg-white/10 text-white border border-white/10" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/10"}`}
                    >
                      {isEnrolled ? "Access Curriculum" : "View Details & Enroll"}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
