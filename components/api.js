async function Lemmy(domain) {
  const lemmyFeedContainer = document.createElement("div");
  lemmyFeedContainer.id = "lemmy-feed";

  const state = {
    feedType: "Subscribed", // Default feed type
    filter: "all", // Default filter
    posts: [],
  };

  function render() {
    const html = `
      <div class="lemmy-header">
        <div class="feed-filter-buttons">
          <button class="feed-type-btn ${state.feedType === "Subscribed" ? "active" : ""}" data-feedtype="Subscribed">Subscribed</button>
          <button class="feed-type-btn ${state.feedType === "All" ? "active" : ""}" data-feedtype="All">All</button>
          <button class="feed-type-btn ${state.feedType === "Local" ? "active" : ""}" data-feedtype="Local">Local</button>
        </div>
        <div class="filter-buttons">
            <button class="filter-btn ${state.filter === "all" ? "active" : ""}" data-filter="all">All</button>
            <button class="filter-btn ${state.filter === "posts" ? "active" : ""}" data-filter="posts">Posts</button>
            <button class="filter-btn ${state.filter === "comments" ? "active" : ""}" data-filter="comments">Comments</button>
        </div>
      </div>
      <div id="lemmy-posts-container"></div>
    `;
    lemmyFeedContainer.innerHTML = html;
    attachEventListeners();
    loadPosts();
  }

  function attachEventListeners() {
    lemmyFeedContainer.querySelectorAll(".feed-type-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        state.feedType = e.target.dataset.feedtype;
        render();
      });
    });

    lemmyFeedContainer.querySelectorAll(".filter-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
            state.filter = e.target.dataset.filter;
            renderPosts();
        });
    });
  }

  async function loadPosts() {
    const postsContainer = lemmyFeedContainer.querySelector("#lemmy-posts-container");
    postsContainer.innerHTML = `<div class="loading"></div>`;
    
    // The Lemmy API uses 'Subscribed', 'All', and 'Local' for the type_ parameter.
    const posts = await getLemmyPosts(domain, state.feedType, "Hot");
    state.posts = posts;
    renderPosts();
  }

  function renderPosts() {
    const postsContainer = lemmyFeedContainer.querySelector("#lemmy-posts-container");
    postsContainer.innerHTML = "";

    let filteredPosts = state.posts;

    if (state.filter === "posts") {
        filteredPosts = state.posts.filter(post => !post.post.url || post.post.body);
    } else if (state.filter === "comments") {
        // This is a simplification. A real comment filter might need a different API endpoint
        // or more complex logic to fetch comments separately.
        // For now, we'll just show nothing for "comments" as an example.
        filteredPosts = []; 
    }

    if (filteredPosts.length === 0) {
        postsContainer.innerHTML = `<p class="no-posts">No posts to show for the current filter.</p>`;
        return;
    }

    filteredPosts.forEach(async (post) => {
      const postElement = await LemmyPost(post, domain);
      postsContainer.appendChild(postElement);
    });
  }

  render();

  return lemmyFeedContainer;
}
