import { NextResponse } from "next/server";
import { INITIAL_ARTICLES } from "@/lib/articleData";

if (!globalThis.__LEGAL_ARTICLES__) {
  globalThis.__LEGAL_ARTICLES__ = JSON.parse(JSON.stringify(INITIAL_ARTICLES));
}

export async function GET(request, context) {
  try {
    const params = await context.params;
    const { id } = params;

    const article = globalThis.__LEGAL_ARTICLES__.find(
      (a) => a.id === id || a.slug === id
    );

    if (!article) {
      return NextResponse.json(
        { status: "error", message: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      article
    });
  } catch (error) {
    console.error("Error retrieving article:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to retrieve article details" },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { action, text, author_name, author_role, author_badge, author_avatar, delta = 1 } = body;

    const article = globalThis.__LEGAL_ARTICLES__.find(
      (a) => a.id === id || a.slug === id
    );

    if (!article) {
      return NextResponse.json(
        { status: "error", message: "Article not found" },
        { status: 404 }
      );
    }

    if (!article.metrics) {
      article.metrics = { likes: 0, comments: 0, saves: 0, shares: 0 };
    }

    if (action === "like") {
      article.metrics.likes = Math.max(0, article.metrics.likes + delta);
      return NextResponse.json({
        status: "success",
        action: "like",
        likes: article.metrics.likes
      });
    }

    if (action === "save") {
      article.metrics.saves = Math.max(0, article.metrics.saves + delta);
      return NextResponse.json({
        status: "success",
        action: "save",
        saves: article.metrics.saves
      });
    }

    if (action === "share") {
      article.metrics.shares = (article.metrics.shares || 0) + 1;
      return NextResponse.json({
        status: "success",
        action: "share",
        shares: article.metrics.shares
      });
    }

    if (action === "comment") {
      if (!text || !text.trim()) {
        return NextResponse.json(
          { status: "error", message: "Comment text cannot be empty" },
          { status: 400 }
        );
      }

      const newComment = {
        id: `c_${Date.now()}`,
        author_name: author_name || "Verified Legal Colleague",
        author_role: author_role || "Legal Practitioner",
        author_badge: author_badge || "Lagos Bar",
        author_avatar:
          author_avatar ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        created_at: "Just now",
        likes: 0,
        text: text.trim()
      };

      if (!article.comments) article.comments = [];
      article.comments.unshift(newComment);
      article.metrics.comments = article.comments.length;

      return NextResponse.json({
        status: "success",
        action: "comment",
        comment: newComment,
        comments_count: article.metrics.comments
      });
    }

    return NextResponse.json(
      { status: "error", message: "Unsupported action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update article interactions" },
      { status: 500 }
    );
  }
}
