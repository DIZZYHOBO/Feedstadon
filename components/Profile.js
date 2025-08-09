commentCard.querySelector('.screenshot-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        try {
                            const postId = item.post.id;
                            const lemmyInstance = new URL(item.community.actor_id).hostname;
                            const { data } = await apiFetch(lemmyInstance, null, `/api/v3/post`, {}, 'lemmy', { id: postId });
                            actions.showScreenshotPage(item, data.post_view);
                        } catch(err) {
                            alert("Could not load data for screenshot.");
                        }
                    });
