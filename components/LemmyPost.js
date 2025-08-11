import {
  html,
  useEffect,
  useState,
} from "https://unpkg.com/htm/preact/standalone.module.js";
import { timeSince, timeAgo } from "../utils.js";
import { getPost } from "../api.js";
import LemmyCommentThread from "./LemmyCommentThread.js";
import Spinner from "./Spinner.js";
import { navigateTo } from "../routing.js";
import { ICONS } from "./icons.js";

const LemmyPost = ({ id }) => {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [sortType, setSortType] = useState("Top"); // Top, New, Old

  useEffect(() => {
    // Lemmy API requires the post ID as a number
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
        console.error("Invalid Post ID");
        // Optionally, render an error message to the user
        return;
    }
    getPost({ id: postId, sort: sortType }).then((data) => {
      if (data) {
        setPost(data);
        setComments(data.comments);
      }
    });
  }, [id, sortType]);

  if (!post) {
    return html`<div class="loading-container"><${Spinner} /></div>`;
  }

  const p = post.post_view.post;
  const community = post.post_view.community;
  const creator = post.post_view.creator;
  const counts = post.post_view.counts;
  const my_vote = post.post_view.my_vote;
  const saved = post.post_view.saved;
  const creator_instance = new URL(creator.actor_id).hostname;

  const fullBodyHtml = p.body ? new showdown.Converter().makeHtml(p.body) : '';

  let mediaHTML = '';
    const url = p.url;
    if (url) {
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const youtubeMatch = url.match(youtubeRegex);

        if (youtubeMatch) {
            mediaHTML = html`
                <div class="video-embed-container">
                    <iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>
                </div>
            `;
        } else if (/\.(mp4|webm)$/i.test(url)) {
            mediaHTML = html`<div class="status-media"><video src="${url}" controls></video></div>`;
        } else if (p.thumbnail_url) {
            mediaHTML = html`<div class="status-media"><img src="${p.thumbnail_url}" alt="${p.name}" loading="lazy"></div>`;
        }
    }

  return html`
    <div class="lemmy-post-full-container">
      <div
        class="lemmy-post-card"
        style="margin-bottom: 20px; cursor: default; border: none; box-shadow: none;"
      >
        <div class="lemmy-post-card-header">
          <img
            src=${creator.avatar || "images/pfp.png"}
            class="lemmy-post-card-avatar"
            style="cursor: pointer;"
            onerror="this.onerror=null;this.src='images/pfp.png';"
            onclick=${(e) => {
              e.stopPropagation();
              navigateTo(`/lemmy/user/${creator.id}`);
            }}
          />
          <div class="lemmy-post-card-user-info">
            <span
              class="lemmy-post-card-username"
              style="cursor: pointer;"
              onclick=${(e) => {
                e.stopPropagation();
                navigateTo(`/lemmy/user/${creator.id}`);
              }}
              >${creator.display_name || creator.name}@${creator_instance}</span
            >
            <span
              class="lemmy-post-card-community"
              style="cursor: pointer;"
              onclick=${(e) => {
                e.stopPropagation();
                navigateTo(`/lemmy/community/${community.name}@${new URL(community.actor_id).hostname}`);
              }}
              >c/${community.name}</span
            >
          </div>
          <span class="lemmy-post-card-time">${timeAgo(p.published)}</span>
        </div>

        <h1
          class="lemmy-post-card-title"
          style="font-size: 20px; margin-top: 12px;"
        >
          ${p.name}
        </h1>
        
        ${mediaHTML}

        ${p.body &&
        html`<div
          class="lemmy-post-card-body"
          style="max-height: none; -webkit-mask-image: none; mask-image: none; font-size: 16px; line-height: 1.5; margin-bottom: 12px; white-space: normal;"
          dangerouslySetInnerHTML=${{ __html: fullBodyHtml }}
        >
        </div>`}
        ${p.url &&
        !p.thumbnail_url &&
        html`
          <a
            href=${p.url}
            target="_blank"
            rel="noopener noreferrer"
            class="lemmy-post-link"
            >${p.url}</a
          >
        `}

        <div class="lemmy-post-card-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn ${my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${counts.score}</span>
                <button class="status-action lemmy-vote-btn ${my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="quick-reply">${ICONS.reply}</button>
            <button class="status-action" data-action="view-post">${ICONS.comments} ${counts.comments}</button>
            <button class="status-action ${saved ? 'active' : ''}" data-action="save">${ICONS.bookmark}</button>
        </div>
      </div>

      <div class="lemmy-comments-container">
        <div class="lemmy-comment-sort">
          <span>Sort by:</span>
          <select
            onchange=${(e) => setSortType(e.target.value)}
            value=${sortType}
          >
            <option value="Top">Top</option>
            <option value="New">New</option>
            <option value="Old">Old</option>
          </select>
        </div>
        ${comments.map(
          (comment) => html`<${LemmyCommentThread} comment=${comment} />`
        )}
      </div>
    </div>
  `;
};

export default LemmyPost;
