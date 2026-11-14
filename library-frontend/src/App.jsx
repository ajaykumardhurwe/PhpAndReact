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














import { useEffect, useState } from 'react';

import './App.css'

const API_URL = 'http://localhost/library-api/books.php';

const initialForm = {
  title: '',
  author: '',
  isbn: '',
  category: '',
  quantity: 1
};

function App() {

  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // READ: Fetch all books
  const fetchBooks = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}?search=${encodeURIComponent(search)}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to fetch books');
      }

      setBooks(result.data || []);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [search]);

  // Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value
    });
  };

  // CREATE and UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const isEditing = editingId !== null;

      const payload = {
        ...form,
        quantity: Number(form.quantity),
        ...(isEditing ? { id: editingId } : {})
      };

      const response = await fetch(API_URL, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Operation failed');
      }

      setMessage(result.message);
      setForm(initialForm);
      setEditingId(null);

      await fetchBooks();

    } catch (error) {
      setMessage(error.message);
    }
  };

  // EDIT: Load book into form
  const handleEdit = (book) => {

    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      quantity: Number(book.quantity)
    });

    setEditingId(Number(book.id));

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // CANCEL EDIT
  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  // DELETE
  const handleDelete = async (id) => {

    if (!window.confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}?id=${id}`,
        {
          method: 'DELETE'
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Delete failed');
      }

      setMessage(result.message);
      await fetchBooks();

    } catch (error) {
      setMessage(error.message);
    }
  };

  const totalBooks = books.reduce(
    (total, book) => total + Number(book.quantity), 0
  );

  const availableBooks = books.reduce(
    (total, book) => total + Number(book.available), 0
  );

  const categories = new Set(
    books.map(book => book.category)
  ).size;

  return (

    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div>
          <h1>📚 Library Management</h1>
          <p>Manage your library books easily</p>
        </div>

        <span className="admin-badge">Admin Panel</span>
      </header>

      <main className="container">

        {/* MESSAGE */}
        {message && (
          <div className="message">
            {message}
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {/* DASHBOARD */}
        <section className="stats">

          <div className="stat-card">
            <span>Total Titles</span>
            <h2>{books.length}</h2>
          </div>

          <div className="stat-card">
            <span>Total Copies</span>
            <h2>{totalBooks}</h2>
          </div>

          <div className="stat-card">
            <span>Available Copies</span>
            <h2>{availableBooks}</h2>
          </div>

          <div className="stat-card">
            <span>Categories</span>
            <h2>{categories}</h2>
          </div>

        </section>

        {/* BOOK FORM */}
        <section className="panel">

          <div className="section-heading">
            <h2>
              {editingId ? '✏️ Update Book' : '➕ Add New Book'}
            </h2>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              <div className="form-group">
                <label>Book Title</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Enter book title"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Author</label>
                <input
                  type="text"
                  name="author"
                  placeholder="Enter author name"
                  value={form.author}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>ISBN</label>
                <input
                  type="text"
                  name="isbn"
                  placeholder="Enter ISBN"
                  value={form.isbn}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Fiction">Fiction</option>
                  <option value="Non-Fiction">Non-Fiction</option>
                  <option value="Science">Science</option>
                  <option value="Technology">Technology</option>
                  <option value="Biography">Biography</option>
                  <option value="History">History</option>
                  <option value="Self Help">Self Help</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                />
              </div>

            </div>

            <div className="form-actions">

              <button type="submit" className="primary-btn">
                {editingId ? 'Update Book' : 'Add Book'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}

            </div>

          </form>

        </section>

        {/* BOOK LIST */}
        <section className="panel">

          <div className="section-heading book-heading">
            <div>
              <h2>📖 Book Inventory</h2>
              <p>Manage all registered books</p>
            </div>

            <input
              className="search-input"
              type="search"
              placeholder="Search title, author, ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="empty">Loading books...</p>
          ) : books.length === 0 ? (
            <p className="empty">No books found.</p>
          ) : (

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>ISBN</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {books.map((book) => (

                    <tr key={book.id}>

                      <td>{book.id}</td>

                      <td className="book-title">
                        {book.title}
                      </td>

                      <td>{book.author}</td>

                      <td>{book.isbn}</td>

                      <td>
                        <span className="category">
                          {book.category}
                        </span>
                      </td>

                      <td>{book.quantity}</td>

                      <td>
                        <span className="available">
                          {book.available}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">

                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(book)}
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(book.id)}
                          >
                            Delete
                          </button>

                        </div>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>

      <footer>
        Library Management System © 2026
      </footer>

    </div>
  );
}

export default App;
