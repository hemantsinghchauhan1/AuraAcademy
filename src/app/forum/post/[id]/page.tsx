import { getSessionUser } from "@/lib/auth";
import { getPostDetails } from "@/services/forumService";
import { redirect } from "next/navigation";
import PostDetail from "./PostDetail";

export const revalidate = 0; // Live comments updates

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const user = await getSessionUser();
  const { id } = await params;

  if (!user) {
    redirect(`/login?callbackUrl=/forum/post/${id}`);
  }

  const post = await getPostDetails(id);

  if (!post) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen py-8 bg-[#09090b]">
      <PostDetail
        userId={user.id}
        post={{
          id: post.id,
          title: post.title,
          content: post.content,
          upvotes: post.upvotes,
          communitySlug: post.community.slug,
          communityName: post.community.name,
          createdAt: post.createdAt.toLocaleDateString(),
          user: post.user ? {
            email: post.user.email,
            profile: post.user.profile ? {
              name: post.user.profile.name,
              avatarUrl: post.user.profile.avatarUrl,
            } : undefined
          } : undefined,
          comments: post.comments.map((c) => ({
            id: c.id,
            text: c.text,
            createdAt: c.createdAt.toLocaleString(),
            user: c.user ? {
              email: c.user.email,
              profile: c.user.profile ? {
                name: c.user.profile.name,
                avatarUrl: c.user.profile.avatarUrl,
              } : undefined
            } : undefined,
          })),
        }}
      />
    </div>
  );
}
