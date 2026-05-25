"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Self-seeding default communities on startup
async function ensureSeedCommunities() {
  try {
    const communityCount = await db.community.count();
    if (communityCount > 0) return;

    await db.community.createMany({
      data: [
        {
          name: "Quantum Mathematics",
          slug: "quantum-math",
          description: "Discuss eigenvalues, wave functions, vector spaces, and advanced mathematical physics.",
        },
        {
          name: "Algorithms & Structures",
          slug: "algorithms",
          description: "Discuss dynamic programming, graph traversals, complexity parameters, and sorting bounds.",
        },
        {
          name: "Enterprise System Design",
          slug: "system-design",
          description: "Discuss load balancing, distributed caching, CAP tradeoffs, database scaling, and circuit breakers.",
        },
      ],
    });
  } catch (e) {
    console.error("Failed to seed communities:", e);
  }
}

export async function getCommunities() {
  await ensureSeedCommunities();
  try {
    return await db.community.findMany({
      orderBy: { name: "asc" },
    });
  } catch (e) {
    console.error("Failed to fetch communities:", e);
    return [];
  }
}

export async function getCommunityPosts(communitySlug: string) {
  await ensureSeedCommunities();
  try {
    const community = await db.community.findUnique({
      where: { slug: communitySlug },
    });

    if (!community) return [];

    return await db.post.findMany({
      where: { communityId: community.id },
      include: {
        user: {
          select: {
            email: true,
            profile: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("Failed to fetch community posts:", e);
    return [];
  }
}

export async function getPostDetails(postId: string) {
  try {
    return await db.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            email: true,
            profile: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        community: true,
        comments: {
          include: {
            user: {
              select: {
                email: true,
                profile: {
                  select: {
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  } catch (e) {
    console.error("Failed to fetch post details:", e);
    return null;
  }
}

export async function createPost(
  userId: string,
  communitySlug: string,
  title: string,
  content: string
) {
  try {
    const community = await db.community.findUnique({
      where: { slug: communitySlug },
    });

    if (!community) throw new Error("Community not found");

    const post = await db.post.create({
      data: {
        title,
        content,
        userId,
        communityId: community.id,
        upvotes: 1, // Author automatically upvotes their own post!
      },
    });

    // Automatically record the author's initial upvote in the Vote table
    await db.vote.create({
      data: {
        userId,
        postId: post.id,
        value: 1,
      },
    });

    revalidatePath(`/forum/${communitySlug}`);
    return { success: true, postId: post.id };
  } catch (e: any) {
    console.error("Failed to create post:", e);
    return { success: false, error: e.message || "Failed to submit post." };
  }
}

export async function createComment(userId: string, postId: string, text: string) {
  try {
    const comment = await db.comment.create({
      data: {
        postId,
        userId,
        text,
      },
    });

    revalidatePath(`/forum/post/${postId}`);
    return { success: true, commentId: comment.id };
  } catch (e: any) {
    console.error("Failed to create comment:", e);
    return { success: false, error: e.message || "Failed to submit comment." };
  }
}

export async function votePost(userId: string, postId: string, voteValue: number) {
  try {
    // Run everything in a secure transaction to guarantee integrity
    await db.$transaction(async (tx) => {
      // Check if user has already voted on this post
      const existingVote = await tx.vote.findUnique({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });

      let voteChange = 0;

      if (existingVote) {
        if (existingVote.value === voteValue) {
          // If clicking the same vote button, delete the vote (toggle off!)
          await tx.vote.delete({
            where: { id: existingVote.id },
          });
          voteChange = -voteValue; // Reverse the previous vote
        } else {
          // If changing vote (e.g. from Upvote to Downvote)
          await tx.vote.update({
            where: { id: existingVote.id },
            data: { value: voteValue },
          });
          voteChange = voteValue * 2; // Upward or downward shift of 2
        }
      } else {
        // If voting for the first time
        await tx.vote.create({
          data: {
            userId,
            postId,
            value: voteValue,
          },
        });
        voteChange = voteValue;
      }

      // Update total upvotes score inside the Post table
      await tx.post.update({
        where: { id: postId },
        data: {
          upvotes: { increment: voteChange },
        },
      });
    });

    return { success: true };
  } catch (e: any) {
    console.error("Failed to record vote:", e);
    return { success: false, error: e.message || "Failed to register vote." };
  }
}
