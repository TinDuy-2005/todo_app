const mongoose = require("mongoose");

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

module.exports = mongoose.model("Task", taskSchema);