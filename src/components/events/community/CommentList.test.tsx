import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommentList from "./CommentList";
import type { CommunityCommentView } from "./types";

vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));

function makeComment(overrides: Partial<CommunityCommentView> = {}): CommunityCommentView {
  return {
    id: "comment-1",
    postId: "post-1",
    authorId: "author-1",
    content: "hello world",
    imageUrls: [],
    gifUrl: null,
    status: "APPROVED",
    createdAt: new Date().toISOString(),
    author: { id: "author-1", name: "Author One", username: "author1", imageUrl: null, isAdmin: false },
    mentionedUsers: [],
    ...overrides,
  };
}

describe("CommentList delete button visibility", () => {
  it("shows the delete button when the current user authored the comment", () => {
    render(
      <CommentList
        postId="post-1"
        eventId={1}
        initialComments={[makeComment({ author: { id: "me", name: "Me", username: "me", imageUrl: null, isAdmin: false } })]}
        totalCount={1}
        currentUserId="me"
      />,
    );

    expect(screen.getAllByLabelText("Delete comment").length).toBeGreaterThan(0);
  });

  it("hides the delete button for another user's comment when the viewer is not a moderator", () => {
    render(
      <CommentList
        postId="post-1"
        eventId={1}
        initialComments={[makeComment({ author: { id: "someone-else", name: "Someone Else", username: "se", imageUrl: null, isAdmin: false } })]}
        totalCount={1}
        currentUserId="me"
      />,
    );

    expect(screen.queryAllByLabelText("Delete comment").length).toBe(0);
  });

  it("shows the delete button for another user's comment when the viewer can moderate", () => {
    render(
      <CommentList
        postId="post-1"
        eventId={1}
        initialComments={[makeComment({ author: { id: "someone-else", name: "Someone Else", username: "se", imageUrl: null, isAdmin: false } })]}
        totalCount={1}
        currentUserId="me"
        canModerate
      />,
    );

    expect(screen.getAllByLabelText("Delete comment").length).toBeGreaterThan(0);
  });

  it("hides the delete button when there is no signed-in viewer", () => {
    render(
      <CommentList
        postId="post-1"
        eventId={1}
        initialComments={[makeComment()]}
        totalCount={1}
        currentUserId={null}
      />,
    );

    expect(screen.queryAllByLabelText("Delete comment").length).toBe(0);
  });
});
