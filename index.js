
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();


// =======================
// CONFIG
// =======================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "todo-secret-key",
    resave: false,
    saveUninitialized: false
}));

app.set("view engine", "ejs");


// =======================
// CONNECT MONGODB
// =======================

mongoose.connect("mongodb://127.0.0.1:27017/todo_db")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));


// =======================
// MODELS
// =======================

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        unique: true,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    fullName: {
        type: String,
        required: true
    }

});

const User = mongoose.model("User", userSchema);


const taskSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    isDone: {
        type: Boolean,
        default: false
    },

    doneAt: {
        type: Date,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

const Task = mongoose.model("Task", taskSchema);


// =======================
// MIDDLEWARE CHECK LOGIN
// =======================

function requireLogin(req, res, next) {

    if (!req.session.userId)
        return res.redirect("/login");

    next();
}


// =======================
// AUTH ROUTES
// =======================

// REGISTER PAGE

app.get("/register", (req, res) => {

    res.render("register");

});


// REGISTER PROCESS

app.post("/register", async (req, res) => {

    try {

        const { username, password, fullName } = req.body;

        const existingUser = await User.findOne({ username });

        if (existingUser)
            return res.send("Username already exists");

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({

            username,
            password: hashedPassword,
            fullName

        });

        await user.save();

        res.redirect("/login");

    }
    catch (err) {

        res.send(err.message);

    }

});
// =======================
// REGISTER
// =======================

// hiển thị trang register

app.get("/register", (req, res) => {

    res.render("register");

});


// xử lý register

app.post("/register", async (req, res) => {

    try {

        const { username, password, fullName } = req.body;

        // kiểm tra username tồn tại

        const existingUser = await User.findOne({ username });

        if (existingUser) {

            return res.send("Username already exists");

        }

        // hash password

        const hashedPassword = await bcrypt.hash(password, 10);

        // tạo user mới

        const newUser = new User({

            username,
            password: hashedPassword,
            fullName

        });

        await newUser.save();

        res.redirect("/login");

    }
    catch (err) {

        res.send(err.message);

    }

});

// LOGIN PAGE

app.get("/login", (req, res) => {

    res.render("login");

});


// LOGIN PROCESS

app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user)
        return res.send("User not found");

    const match = await bcrypt.compare(password, user.password);

    if (!match)
        return res.send("Wrong password");

    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.fullName = user.fullName;

    res.redirect("/");

});


// LOGOUT

app.get("/logout", (req, res) => {

    req.session.destroy();

    res.redirect("/login");

});


// =======================
// WEB INTERFACE
// =======================

// HOME PAGE

app.get("/", requireLogin, async (req, res) => {

    const tasks = await Task.find({
        user: req.session.userId
    }).populate("user");

    res.render("index", {

        tasks,
        username: req.session.username,
        fullName: req.session.fullName

    });

});


// ADD TASK

app.post("/add-task", requireLogin, async (req, res) => {

    const task = new Task({

        title: req.body.title,
        user: req.session.userId

    });

    await task.save();

    res.redirect("/");

});


// DONE TASK

app.post("/done-task/:id", requireLogin, async (req, res) => {

    await Task.findByIdAndUpdate(

        req.params.id,

        {
            isDone: true,
            doneAt: new Date()
        }

    );

    res.redirect("/");

});


// DELETE TASK

app.post("/delete-task/:id", requireLogin, async (req, res) => {

    await Task.findByIdAndDelete(req.params.id);

    res.redirect("/");

});


// =======================
// LEVEL 1 APIs
// =======================


// CREATE USER

app.post("/api/users", async (req, res) => {

    try {

        const { username, password, fullName } = req.body;

        const existingUser = await User.findOne({ username });

        if (existingUser)
            return res.json({
                message: "Username already exists"
            });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({

            username,
            password: hashedPassword,
            fullName

        });

        await user.save();

        res.json(user);

    }
    catch (err) {

        res.json({ error: err.message });

    }

});


// GET ALL TASKS

app.get("/api/tasks", async (req, res) => {

    const tasks = await Task.find()
        .populate("user", "username fullName");

    res.json(tasks);

});


// GET TASK BY USERNAME

app.get("/api/tasks/user/:username", async (req, res) => {

    const user = await User.findOne({
        username: req.params.username
    });

    if (!user)
        return res.json({ message: "User not found" });

    const tasks = await Task.find({
        user: user._id
    }).populate("user");

    res.json(tasks);
});


// GET TASK TODAY

app.get("/api/tasks/today", async (req, res) => {

    const start = new Date();
    start.setHours(0,0,0,0);

    const end = new Date();
    end.setHours(23,59,59,999);

    const tasks = await Task.find({

        createdAt: {
            $gte: start,
            $lte: end
        }

    }).populate("user");

    res.json(tasks);

});


// GET TASK NOT DONE

app.get("/api/tasks/not-done", async (req, res) => {

    const tasks = await Task.find({

        isDone: false

    }).populate("user");

    res.json(tasks);

});


// GET TASK USER LASTNAME NGUYEN

app.get("/api/tasks/lastname/nguyen", async (req, res) => {

    const users = await User.find({

        fullName: {
            $regex: /^nguyen/i
        }

    });

    const ids = users.map(u => u._id);

    const tasks = await Task.find({

        user: {
            $in: ids
        }

    }).populate("user");

    res.json(tasks);

});


// =======================
// START SERVER
// =======================

app.listen(3000, () => {

    console.log("Server running at http://localhost:3000");

});
