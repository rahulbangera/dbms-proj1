const express = require("express")
const mongoose = require("mongoose")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const path = require("path")
const methodOverride = require("method-override")
const flash = require("connect-flash")

// Import routes
const authRoutes = require("./routes/auth")
const dashboardRoutes = require("./routes/dashboard")
const groupRoutes = require("./routes/group")
const expenseRoutes = require("./routes/expense")

// Create Express app
const app = express()

// Connect to MongoDB
mongoose
  .connect("mongodb+srv://hero:Q6LKeWDGki8YSBJS@cluster0.8yvdjjq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Configure Express
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.static(path.join(__dirname, "public")))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(methodOverride("_method"))

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "EasySplit-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb+srv://hero:Q6LKeWDGki8YSBJS@cluster0.8yvdjjq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 1 week
  }),
)

// Flash messages
app.use(flash())

// Global variables
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null
  res.locals.success = req.flash("success")
  res.locals.error = req.flash("error")
  next()
})

// Routes
app.use("/", authRoutes)
app.use("/dashboard", dashboardRoutes)
app.use("/groups", groupRoutes)
app.use("/expenses", expenseRoutes)

// Home route
app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard")
  }
  res.render("home")
})

// 404 route
app.use((req, res) => {
  res.status(404).render("404")
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
