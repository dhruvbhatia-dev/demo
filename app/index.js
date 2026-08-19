const express = require('express');
const { initializeDbPool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let pool;

async function startServer() {
  try {
    pool = await initializeDbPool();
    console.log("Database Connection Pool successfully initialized.");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server due to DB connection error:", error);
  }
}

app.get('/', async (req, res) => {
  let tasks = [];
  try {
    if (pool) {
      const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
      tasks = rows;
    }
  } catch (err) {
    console.error("Dashboard fetch error:", err.message);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>DevSecOps Task Manager</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; background: #eef2f5; }
        .container { max-width: 650px; background: #ffffff; padding: 30px; margin: 0 auto; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        h2 { color: #1a202c; margin-top: 0; }
        .input-group { display: flex; gap: 10px; margin-bottom: 25px; }
        input[type="text"] { flex: 1; padding: 12px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 15px; }
        button { padding: 12px 20px; background: #3182ce; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
        button:hover { background: #2b6cb0; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { background: #f7fafc; border: 1px solid #e2e8f0; margin-bottom: 10px; padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
        .status { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .pending { background: #feebc8; color: #c05621; }
        .done { background: #c6f6d5; color: #22543d; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🚀 Node.js + AWS RDS DevSecOps App</h2>
        <form action="/tasks" method="POST" class="input-group">
          <input type="text" name="title" placeholder="Enter new task..." required />
          <button type="submit">Add Task</button>
        </form>
        <h3>All Tasks:</h3>
        <ul>
          ${tasks.length === 0 ? '<li>No tasks found. Add your first task!</li>' : ''}
          ${tasks.map(t => `
            <li>
              <span>${t.title}</span>
              <span class="status ${t.completed ? 'done' : 'pending'}">${t.completed ? 'Completed' : 'Pending'}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'HEALTHY', db: 'CONNECTED' });
  } catch (error) {
    res.status(500).json({ status: 'UNHEALTHY', error: error.message });
  }
});


app.get('/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  try {
    const [result] = await pool.query('INSERT INTO tasks (title) VALUES (?)', [title]);
    
    // Check if request is from Browser HTML Form
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      return res.redirect('/');
    }
    
    res.status(201).json({ id: result.insertId, title, completed: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE tasks SET title = COALESCE(?, title), completed = COALESCE(?, completed) WHERE id = ?',
      [title, completed, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json({ message: 'Task updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

startServer();