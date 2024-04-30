// server.js
const express = require('express')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const sqlite3 = require('sqlite3').verbose()

const app = express()
const port = 3000
const secretKey = 'your_secret_key'

// Create a new SQLite database and open a connection
const db = new sqlite3.Database(':memory:')

// Create Users and Tasks tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password_hash TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS Tasks (
    id INTEGER PRIMARY KEY,
    title TEXT,
    description TEXT,
    status TEXT,
    assignee_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignee_id) REFERENCES Users(id)
  )`)
})

app.use(bodyParser.json())

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token == null) return res.sendStatus(401)

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

// Routes

// Register a new user
app.post('/register', (req, res) => {
  const {username, password} = req.body
  const password_hash = /* hash password */ password // Implement password hashing
  const sql = `INSERT INTO Users (username, password_hash) VALUES (${username} , ${password})`
  const values = [username, password_hash]

  db.run(sql, values, function (err) {
    if (err) {
      return res.status(500).json({error: err.message})
    }
    res.json({message: 'User registered successfully'})
  })
})

// Login and generate JWT token
app.post('/login', (req, res) => {
  const {username, password} = req.body

  const user = {username}
  const token = jwt.sign(user, secretKey)
  res.json({token})
})

app.use(authenticateToken)

// CRUD operations for Tasks

// Create a new task
app.post('/tasks', (req, res) => {
  const {title, description, status, assignee_id} = req.body
  const sql = `INSERT INTO Tasks (title, description, status, assignee_id) VALUES (${title}, ${description}, ${status}, ${assignee_id})`
  const values = [title, description, status, assignee_id]

  db.run(sql, values, function (err) {
    if (err) {
      return res.status(500).json({error: err.message})
    }
    res.json({
      id: this.lastID,
      title,
      description,
      status,
      assignee_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  })
})

// Retrieve all tasks
app.get('/tasks', (req, res) => {
  const sql = `SELECT * FROM Tasks`

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({error: err.message})
    }
    res.json(rows)
  })
})

// Retrieve a specific task by ID
app.get('/tasks/:id', (req, res) => {
  const id = req.params.id
  const sql = `SELECT * FROM Tasks WHERE id = ${id}`

  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({error: err.message})
    }
    if (!row) {
      return res.status(404).json({message: 'Task not found'})
    }
    res.json(row)
  })
})

// Update a specific task by ID
app.put('/tasks/:id', (req, res) => {
  const id = req.params.id
  const {status} = req.body
  const sql = `UPDATE Tasks SET status = ${status}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`

  db.run(sql, [status, id], function (err) {
    if (err) {
      return res.status(500).json({error: err.message})
    }
    if (this.changes === 0) {
      return res.status(404).json({message: 'Task not found'})
    }
    res.json({message: 'Task updated successfully'})
  })
})

// Delete a specific task by ID
app.delete('/tasks/:id', (req, res) => {
  const id = req.params.id
  const sql = `DELETE FROM Tasks WHERE id = ${id}`

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({error: err.message})
    }
    if (this.changes === 0) {
      return res.status(404).json({message: 'Task not found'})
    }
    res.json({message: `Task with ID ${id} deleted successfully`})
  })
})

// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`)
})