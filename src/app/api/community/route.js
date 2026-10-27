import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";
import {
  COMMUNITY_POLLS,
  LIVE_AMAS,
  DAILY_QUICK_TAKES,
  LEGAL_PLAYBOOKS,
  REACTION_TYPES
} from "@/lib/communityData";

// Maintain server runtime state for interactive updates
if (!globalThis.__COMMUNITY_POLLS__) {
  globalThis.__COMMUNITY_POLLS__ = JSON.parse(JSON.stringify(COMMUNITY_POLLS));
}
if (!globalThis.__LIVE_AMAS__) {
  globalThis.__LIVE_AMAS__ = JSON.parse(JSON.stringify(LIVE_AMAS));
}
if (!globalThis.__COMMUNITY_REACTIONS__) {
  globalThis.__COMMUNITY_REACTIONS__ = {
    q_001: { sound: 28, lifesaver: 35, clarify: 4, debate: 12 },
    q_002: { sound: 14, lifesaver: 29, clarify: 2, debate: 18 },
    q_003: { sound: 45, lifesaver: 82, clarify: 1, debate: 6 },
    q_004: { sound: 19, lifesaver: 24, clarify: 5, debate: 3 }
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    let questions = mockDb.communityQuestions || [];

    if (category && category !== "All") {
      questions = questions.filter(
        (q) => q.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (tag) {
      questions = questions.filter(
        (q) => q.tags && q.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      );
    }

    if (search) {
      const qLower = search.toLowerCase();
      questions = questions.filter(
        (q) =>
          q.title.toLowerCase().includes(qLower) ||
          q.body.toLowerCase().includes(qLower) ||
          q.category.toLowerCase().includes(qLower) ||
          (q.tags && q.tags.some((t) => t.toLowerCase().includes(qLower)))
      );
    }

    return NextResponse.json({
      status: "success",
      count: questions.length,
      questions,
      polls: globalThis.__COMMUNITY_POLLS__,
      amas: globalThis.__LIVE_AMAS__,
      quickTakes: DAILY_QUICK_TAKES,
      playbooks: LEGAL_PLAYBOOKS,
      reactions: globalThis.__COMMUNITY_REACTIONS__,
      reactionTypes: REACTION_TYPES,
      onlineLawyersCount: 19
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!mockDb.communityQuestions) {
      mockDb.communityQuestions = [];
    }

    // 1. Ask Question
    if (action === "ask_question") {
      const { title, text, category, is_anonymous, author_name, tags, pseudonym } = body;
      if (!title || !text) {
        return NextResponse.json(
          { status: "error", message: "Title and question details are required." },
          { status: 400 }
        );
      }

      const displayName = is_anonymous
        ? (pseudonym || "Curious Community Member")
        : (author_name || "Community Member");

      const parsedTags = Array.isArray(tags)
        ? tags
        : (tags || "")
            .split(",")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean);

      const newId = `q_${Date.now()}`;
      const newQuestion = {
        id: newId,
        title: title.trim(),
        body: text.trim(),
        category: category || "General Legal",
        author_name: displayName,
        is_anonymous: Boolean(is_anonymous),
        author_role: "client",
        author_id: Date.now(),
        user_handle: is_anonymous ? "@anonymous_citizen" : `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        created_at: "Just now",
        timestamp: Date.now(),
        upvotes: 1,
        tags: parsedTags.length > 0 ? parsedTags : ["LegalAdvice", "NigerianLaw"],
        answers: []
      };

      mockDb.communityQuestions.unshift(newQuestion);
      globalThis.__COMMUNITY_REACTIONS__[newId] = { sound: 1, lifesaver: 1, clarify: 0, debate: 0 };

      return NextResponse.json({
        status: "success",
        message: "Question published to community lounge.",
        question: newQuestion
      });
    }

    // 2. Add Answer
    if (action === "add_answer") {
      const { question_id, text, lawyer_name, lawyer_title, is_san, nba_branch } = body;
      const question = mockDb.communityQuestions.find((q) => q.id === question_id);
      if (!question) {
        return NextResponse.json(
          { status: "error", message: "Question not found." },
          { status: 404 }
        );
      }
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { status: "error", message: "Answer content cannot be empty." },
          { status: 400 }
        );
      }

      const newAnswer = {
        id: `ans_${Date.now()}`,
        lawyer_id: `lw_verified_${Date.now()}`,
        lawyer_name: lawyer_name || "Barr. Amaka Okonkwo",
        lawyer_title: lawyer_title || "Verified Counsel • Nigerian Bar Association",
        is_san: Boolean(is_san),
        is_verified_lawyer: true,
        nba_branch: nba_branch || "Lagos Branch",
        upvotes: 1,
        created_at: "Just now",
        body: text.trim(),
        deliberations: []
      };

      question.answers.push(newAnswer);

      return NextResponse.json({
        status: "success",
        message: "Professional legal opinion submitted.",
        answer: newAnswer,
        question
      });
    }

    // 3. Add Deliberation
    if (action === "add_deliberation") {
      const { question_id, answer_id, comment, lawyer_name, lawyer_title, is_san, nba_branch } = body;
      const question = mockDb.communityQuestions.find((q) => q.id === question_id);
      if (!question) {
        return NextResponse.json({ status: "error", message: "Question not found." }, { status: 404 });
      }
      const answer = question.answers.find((a) => a.id === answer_id);
      if (!answer) {
        return NextResponse.json({ status: "error", message: "Answer thread not found." }, { status: 404 });
      }
      if (!comment || comment.trim().length === 0) {
        return NextResponse.json({ status: "error", message: "Deliberation text cannot be empty." }, { status: 400 });
      }

      const newDeliberation = {
        id: `delib_${Date.now()}`,
        lawyer_id: `lw_peer_${Date.now()}`,
        lawyer_name: lawyer_name || "Ibrahim Yusuf SAN",
        lawyer_title: lawyer_title || "Senior Advocate of Nigeria",
        is_san: is_san !== undefined ? Boolean(is_san) : true,
        nba_branch: nba_branch || "Abuja Branch",
        comment: comment.trim(),
        created_at: "Just now",
        upvotes: 1
      };

      answer.deliberations.push(newDeliberation);

      return NextResponse.json({
        status: "success",
        message: "Peer deliberation posted.",
        deliberation: newDeliberation,
        question
      });
    }

    // 4. Vote on Poll
    if (action === "vote_poll") {
      const { poll_id, option_id } = body;
      const poll = globalThis.__COMMUNITY_POLLS__.find((p) => p.id === poll_id);
      if (!poll) {
        return NextResponse.json({ status: "error", message: "Poll not found" }, { status: 404 });
      }
      const option = poll.options.find((o) => o.id === option_id);
      if (!option) {
        return NextResponse.json({ status: "error", message: "Option not found" }, { status: 404 });
      }

      option.votes = (option.votes || 0) + 1;
      poll.total_votes = (poll.total_votes || 0) + 1;

      // Recalculate percentages
      poll.options.forEach((opt) => {
        opt.percentage = Math.round((opt.votes / poll.total_votes) * 100);
      });

      return NextResponse.json({
        status: "success",
        poll
      });
    }

    // 5. Add Reaction to Question
    if (action === "react_question") {
      const { question_id, reaction_key } = body;
      if (!globalThis.__COMMUNITY_REACTIONS__[question_id]) {
        globalThis.__COMMUNITY_REACTIONS__[question_id] = { sound: 0, lifesaver: 0, clarify: 0, debate: 0 };
      }
      if (globalThis.__COMMUNITY_REACTIONS__[question_id][reaction_key] !== undefined) {
        globalThis.__COMMUNITY_REACTIONS__[question_id][reaction_key] += 1;
      }
      return NextResponse.json({
        status: "success",
        reactions: globalThis.__COMMUNITY_REACTIONS__[question_id]
      });
    }

    // 6. Upvote Question
    if (action === "upvote_question") {
      const { question_id } = body;
      const question = mockDb.communityQuestions.find((q) => q.id === question_id);
      if (question) {
        question.upvotes = (question.upvotes || 0) + 1;
        return NextResponse.json({ status: "success", upvotes: question.upvotes });
      }
      return NextResponse.json({ status: "error", message: "Question not found" }, { status: 404 });
    }

    // 7. Upvote Answer
    if (action === "upvote_answer") {
      const { question_id, answer_id } = body;
      const question = mockDb.communityQuestions.find((q) => q.id === question_id);
      const answer = question?.answers?.find((a) => a.id === answer_id);
      if (answer) {
        answer.upvotes = (answer.upvotes || 0) + 1;
        return NextResponse.json({ status: "success", upvotes: answer.upvotes });
      }
      return NextResponse.json({ status: "error", message: "Answer not found" }, { status: 404 });
    }

    // 8. Submit question to AMA
    if (action === "submit_ama_q") {
      const { ama_id, question_text, author } = body;
      const ama = globalThis.__LIVE_AMAS__.find((a) => a.id === ama_id);
      if (ama) {
        ama.answers_count = (ama.answers_count || 0) + 1;
        return NextResponse.json({
          status: "success",
          message: "Question submitted to lawyer's live desk queue!",
          ama
        });
      }
      return NextResponse.json({ status: "error", message: "AMA not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "error", message: "Invalid action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
