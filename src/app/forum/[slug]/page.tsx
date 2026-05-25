import { getSessionUser } from "@/lib/auth";
import { getCommunities, getCommunityPosts } from "@/services/forumService";
import { redirect } from "next/navigation";
import CommunityClient from "./CommunityClient";

export const revalidate = 0; // Live community updates

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const user = await getSessionUser();
  const { slug } = await params;

  if (!user) {
    redirect(`/login?callbackUrl=/forum/${slug}`);
  }

  // Parallel database fetch for communities and active posts
  const [communities, posts] = await Promise.all([
    getCommunities(),
    getCommunityPosts(slug),
  ]);

  const activeCommunity = communities.find((c) => c.slug === slug);

  if (!activeCommunity) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen py-8 bg-[#09090b]">
      <CommunityClient
        userId={user.id}
        activeCommunity={{
          id: activeCommunity.id,
          name: activeCommunity.name,
          slug: activeCommunity.slug,
          description: activeCommunity.description,
        }}
        communities={communities.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
        }))}
        posts={posts.map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          userId: p.userId,
          user: p.user ? {
            email: p.user.email,
            profile: p.user.profile ? {
              name: p.user.profile.name,
              avatarUrl: p.user.profile.avatarUrl,
            } : undefined
          } : undefined,
          communityId: p.communityId,
          upvotes: p.upvotes,
          commentsCount: p._count.comments,
          createdAt: p.createdAt.toLocaleDateString(),
          updatedAt: p.updatedAt.toLocaleDateString(),
        }))}
      />
    </div>
  );
}
