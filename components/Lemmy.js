import { ICONS } from './icons.js';
import { formatTimestamp, getWordFilter, shouldFilterContent, processSpoilers } from './utils.js';
import { showImageModal } from './ui.js';
import { getLemmyPosts } from './api.js'; // Using the more specific API function
import { LemmyPost } from './LemmyPost.js'; // Assuming LemmyPost component renders the card

/**
 * Main component for displaying the Lemmy feed.
 * It handles fetching data, filtering, and rendering posts.
 * @param {string} domain - The Lemmy instance domain.
 * @param {object} actions - An object containing action functions for interactivity.
 */
export async function Lemmy(domain, actions) {
    const lemmyFeedContainer = document.createElement("div");
    lemmyFeedContainer.id = "lemmy-feed";

    // --- STATE MANAGEMENT ---
    // Manages the current view type (feed and filter) and the loaded posts.
    const state = {
        feedType: "Subscribed", // Default feed: Subscribed, All, Local
        filterType: "all", // Default filter: all, posts, media
        sortType: "Hot", // Default sort: Hot, New, TopDay, etc.
        posts: [],
        isLoading: false,
    };

    /**
     * Renders the main structure of the Lemmy feed component, including headers and buttons.
     */
    function render() {
        const html = `
            <div class="lemmy-header">
                <div class="feed-filter-buttons">
                    <button class="feed-type-btn ${state.feedType === "Subscribed" ? "active" : ""}" data-feedtype="Subscribed">Subscribed</button>
                    <button class="feed-type-btn ${state.feedType === "All" ? "active" : ""}" data-feedtype="All">All</button>
                    <button class="feed-type-btn ${state.feedType === "Local" ? "active" : ""}" data-feedtype="Local">Local</button>
                </div>
                <div class="filter-buttons">
                    <button class="filter-btn ${state.filterType === "all" ? "active" : ""}" data-filter="all">All</button>
                    <button class="filter-btn ${state.filterType === "posts" ? "active" : ""}" data-filter="posts">Posts</button>
                    <button class="filter-btn ${state.filterType === "media" ? "active" : ""}" data-filter="media">Media</button>
                </div>
            </div>
            <div id="lemmy-posts-container" class="timeline"></div>
        `;
        lemmyFeedContainer.innerHTML = html;
        attachEventListeners();
        loadPosts(); // Initial post load
    }

    /**
     * Attaches click event listeners to the feed and filter buttons.
     */
    function attachEventListeners() {
        // Listeners for feed type buttons (Subscribed, All, Local)
        lemmyFeedContainer.querySelectorAll(".feed-type-btn").forEach((button) => {
            button.addEventListener("click", (e) => {
                if (state.isLoading) return;
                state.feedType = e.target.dataset.feedtype;
                render(); // Re-render to update active button and fetch new feed
            });
        });

        // Listeners for filter buttons (All, Posts, Media)
        lemmyFeedContainer.querySelectorAll(".filter-btn").forEach((button) => {
            button.addEventListener("click", (e) => {
                state.filterType = e.target.dataset.filter;
                // Update active class on buttons without a full re-render
                lemmyFeedContainer.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
                e.target.classList.add("active");
                renderPosts(); // Just re-render the posts with the new filter
            });
        });
    }

    /**
     * Fetches posts from the Lemmy API based on the current state.
     */
    async function loadPosts() {
        state.isLoading = true;
        const postsContainer = lemmyFeedContainer.querySelector("#lemmy-posts-container");
        postsContainer.innerHTML = `<div class="loading"></div>`; // Show loading indicator

        try {
            // Fetch posts using the corrected API call
            const posts = await getLemmyPosts(domain, state.feedType, state.sortType);
            state.posts = posts || []; // Ensure posts is an array
            renderPosts();
        } catch (error) {
            console.error("Failed to load Lemmy posts:", error);
            postsContainer.innerHTML = `<p class="error">Could not load feed. Please try again.</p>`;
        } finally {
            state.isLoading = false;
        }
    }

    /**
     * Filters and renders the posts currently held in the state.
     */
    function renderPosts() {
        const postsContainer = lemmyFeedContainer.querySelector("#lemmy-posts-container");
        postsContainer.innerHTML = "";

        const wordFilterList = getWordFilter();
        let postsToRender = state.posts;

        // --- FILTERING LOGIC ---
        
        // 1. Filter by content keywords
        postsToRender = postsToRender.filter(p => {
            const combinedContent = `${p.post.name} ${p.post.body || ''}`;
            return !shouldFilterContent(combinedContent, wordFilterList);
        });

        // 2. Filter by type (Posts or Media)
        if (state.filterType === "posts") {
            // Show posts that have a text body
            postsToRender = postsToRender.filter(p => p.post.body);
        } else if (state.filterType === "media") {
            // Show posts that have a URL (likely an image or video link)
            postsToRender = postsToRender.filter(p => p.post.url);
        }

        if (postsToRender.length === 0) {
            postsContainer.innerHTML = `<p class="no-posts">No posts to show for the current selection.</p>`;
            return;
        }

        // Render each post using the LemmyPost component
        postsToRender.forEach(async (postData) => {
            // Your original file used `renderLemmyCard`. I'm assuming that logic is now in `LemmyPost.js`
            // If `renderLemmyCard` is what you want to use, you can swap it here.
            const postElement = await LemmyPost(postData, domain, actions);
            if (postElement) {
                postsContainer.appendChild(postElement);
            }
        });
    }

    // Initial render of the component
    render();

    return lemmyFeedContainer;
}
