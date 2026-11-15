// import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

// export default App














import { useEffect, useState } from "react";
import { apiRequest, getToken } from "./api";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      loadUser();
    }
  }, []);

  async function loadUser() {
    try {
      const result = await apiRequest("/me");
      setUser(result.user);
      await loadPosts();
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    }
  }

  async function loadPosts() {
    try {
      const result = await apiRequest("/posts");
      setPosts(result.posts);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleInput(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (authMode === "register") {
        await apiRequest("/register", "POST", form);

        setAuthMode("login");
        setForm({ name: "", email: form.email, password: "" });

        alert("Registration successful! Please login.");
      } else {
        const result = await apiRequest("/login", "POST", {
          email: form.email,
          password: form.password,
        });

        localStorage.setItem("token", result.token);
        setUser(result.user);
        await loadPosts();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setPosts([]);
    setComments({});
    setError("");
  }

  async function createPost(e) {
    e.preventDefault();

    if (!content.trim()) return;

    try {
      await apiRequest("/posts", "POST", { content });
      setContent("");
      await loadPosts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deletePost(id) {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      await apiRequest(`/posts/${id}`, "DELETE");
      await loadPosts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleLike(id) {
    try {
      await apiRequest(`/posts/${id}/like`, "POST");
      await loadPosts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadComments(postId) {
    try {
      const result = await apiRequest(`/posts/${postId}/comments`);

      setComments((previous) => ({
        ...previous,
        [postId]: result.comments,
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function addComment(postId) {
    const comment = commentInputs[postId]?.trim();

    if (!comment) return;

    try {
      await apiRequest(`/posts/${postId}/comments`, "POST", {
        comment,
      });

      setCommentInputs((previous) => ({
        ...previous,
        [postId]: "",
      }));

      await loadComments(postId);
      await loadPosts();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="auth-container">
        <form className="auth-card" onSubmit={handleAuth}>
          <h1>SocialConnect</h1>
          <p>Connect with people around you.</p>

          {error && <div className="error">{error}</div>}

          {authMode === "register" && (
            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleInput}
              required
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleInput}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password (minimum 8 characters)"
            value={form.password}
            onChange={handleInput}
            minLength={8}
            required
          />

          <button disabled={loading}>
            {loading
              ? "Please wait..."
              : authMode === "login"
                ? "Login"
                : "Create Account"}
          </button>

          <p>
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <span
              className="switch"
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setError("");
              }}
            >
              {authMode === "login" ? " Register" : " Login"}
            </span>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <h2>SocialConnect</h2>

        <div className="profile">
          <span>{user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="container">
        <section className="create-post">
          <h2>Create a post</h2>

          <form onSubmit={createPost}>
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="4"
              required
            />

            <button type="submit">Publish Post</button>
          </form>
        </section>

        {error && <div className="error">{error}</div>}

        <h2 className="feed-title">Latest Posts</h2>

        {posts.length === 0 && (
          <p className="empty">No posts yet. Create your first post!</p>
        )}

        {posts.map((post) => (
          <article className="post-card" key={post.id}>
            <div className="post-header">
              <div>
                <h3>{post.author}</h3>
                <small>
                  {new Date(
                    post.created_at.replace(" ", "T") + "Z"
                  ).toLocaleString()}
                </small>
              </div>

              {Number(post.user_id) === Number(user.id) && (
                <button
                  className="delete-btn"
                  onClick={() => deletePost(post.id)}
                >
                  Delete
                </button>
              )}
            </div>

            <p className="post-content">{post.content}</p>

            <div className="post-actions">
              <button
                className={Number(post.liked_by_me) ? "liked" : ""}
                onClick={() => toggleLike(post.id)}
              >
                ♥ {Number(post.liked_by_me) ? "Liked" : "Like"}
              </button>

              <span>{post.likes_count} Likes</span>

              <button onClick={() => loadComments(post.id)}>
                💬 {post.comments_count} Comments
              </button>
            </div>

            <div className="comment-section">
              {comments[post.id] && (
                <div className="comments-list">
                  {comments[post.id].map((item) => (
                    <div className="comment" key={item.id}>
                      <strong>{item.author}</strong>
                      <p>{item.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="comment-input">
                <input
                  placeholder="Write a comment..."
                  value={commentInputs[post.id] || ""}
                  onChange={(e) =>
                    setCommentInputs((previous) => ({
                      ...previous,
                      [post.id]: e.target.value,
                    }))
                  }
                />

                <button onClick={() => addComment(post.id)}>
                  Send
                </button>
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}

export default App;
