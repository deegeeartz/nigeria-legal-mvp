import { NextResponse } from "next/server";
import { INITIAL_ARTICLES } from "@/lib/articleData";

// In-memory articles collection in globalThis
if (!globalThis.__LEGAL_ARTICLES__) {
  globalThis.__LEGAL_ARTICLES__ = JSON.parse(JSON.stringify(INITIAL_ARTICLES));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic");
    const search = searchParams.get("search");
    const authorId = searchParams.get("author_id");
    const sort = searchParams.get("sort") || "latest";

    let articles = globalThis.__LEGAL_ARTICLES__ || [];

    // Filter by topic
    if (topic && topic !== "All") {
      articles = articles.filter(
        (a) => a.practice_area.toLowerCase() === topic.toLowerCase()
      );
    }

    // Filter by author
    if (authorId) {
      articles = articles.filter((a) => a.author.id === authorId);
    }

    // Search query across title, excerpt, content, tags, author name
    if (search) {
      const q = search.toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.author.name.toLowerCase().includes(q) ||
          (a.tags && a.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sorting
    if (sort === "popular") {
      articles.sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0));
    } else if (sort === "discussed") {
      articles.sort((a, b) => (b.metrics?.comments || 0) - (a.metrics?.comments || 0));
    } else {
      // Latest first
      articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    return NextResponse.json({
      status: "success",
      articles,
      count: articles.length
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to retrieve legal articles" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      subtitle = "",
      excerpt = "",
      content,
      practice_area = "Corporate & Startups",
      cover_image = "",
      author_id = "lw_001",
      author_name = "Barr. Amaka Okonkwo",
      author_title = "Corporate & Employment Counsel",
      author_firm = "Okonkwo & Associates Legal Practitioners",
      nba_branch = "Lagos Branch",
      is_san = false,
      tags = []
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { status: "error", message: "Article title and content are required." },
        { status: 400 }
      );
    }

    // Calculate approximate read time: ~200 words per minute
    const wordCount = content.trim().split(/\s+/).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    // Fallback cover photos
    const defaultCovers = [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
    ];
    const resolvedCover = cover_image || defaultCovers[Math.floor(Math.random() * defaultCovers.length)];

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 80);

    const newArticle = {
      id: `art_${Date.now()}`,
      slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      subtitle: subtitle || excerpt.slice(0, 120),
      excerpt: excerpt || content.slice(0, 220) + "...",
      cover_image: resolvedCover,
      read_time_minutes: readTime,
      practice_area,
      published_at: new Date().toISOString(),
      formatted_date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
      author: {
        id: author_id,
        name: author_name,
        title: author_title,
        firm: author_firm,
        nba_branch,
        bar_enrollment: "SCN064821",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
        initials: author_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
        is_san: Boolean(is_san),
        followers_count: 1420
      },
      metrics: {
        likes: 1,
        comments: 0,
        saves: 0,
        shares: 0
      },
      tags: tags.length > 0 ? tags : [practice_area.replace(/[^a-zA-Z]/g, ""), "NigerianLaw", "LegalInsights"],
      content,
      comments: []
    };

    globalThis.__LEGAL_ARTICLES__.unshift(newArticle);

    return NextResponse.json({
      status: "success",
      message: "Article successfully published to the professional network!",
      article: newArticle
    });
  } catch (error) {
    console.error("Error publishing article:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to publish article" },
      { status: 500 }
    );
  }
}
