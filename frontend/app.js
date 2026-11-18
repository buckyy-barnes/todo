
const API_URL = "/tasks";

const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const messageBox = document.getElementById("message");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("empty-state");

const statusFilter = document.getElementById("status-filter");

const formHeading = document.getElementById("form-heading");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit");

let editingTaskId = null;
let tasksCache = [];


// -------------------------
// HELPER: ESCAPE HTML
// -------------------------

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


// -------------------------
// HELPER: SHOW MESSAGE
// -------------------------

function showMessage(message, type = "success") {
    messageBox.textContent = message;

    messageBox.className =
        type === "success"
            ? "message success-message"
            : "message error-message";

    messageBox.classList.remove("hidden");
}


// -------------------------
// HELPER: HIDE MESSAGE
// -------------------------

function hideMessage() {
    messageBox.classList.add("hidden");
}


// -------------------------
// HELPER: GET ERROR MESSAGE
// -------------------------

function getErrorMessage(data) {
    if (data.detail) {
        if (typeof data.detail === "string") {
            return data.detail;
        }

        if (Array.isArray(data.detail)) {
            return data.detail
                .map(error => error.msg)
                .join(", ");
        }
    }

    if (Array.isArray(data.error)) {
        return data.error
            .map(error => error.msg)
            .join(", ");
    }

    return "Something went wrong. Please try again.";
}


// -------------------------
// HELPER: API REQUEST
// -------------------------

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(getErrorMessage(data));
    }

    return data;
}


// -------------------------
// LOAD ALL TASKS
// -------------------------

async function loadTasks() {
    loading.classList.remove("hidden");
    emptyState.classList.add("hidden");
    taskList.innerHTML = "";

    try {
        const selectedStatus = statusFilter.value;

        let url = API_URL;

        if (selectedStatus) {
            url += `?status=${encodeURIComponent(selectedStatus)}`;
        }

        const tasks = await apiRequest(url);

        tasksCache = tasks;

        displayTasks(tasks);

    } catch (error) {
        showMessage(error.message, "error");

    } finally {
        loading.classList.add("hidden");
    }
}


// -------------------------
// DISPLAY TASKS
// -------------------------

function displayTasks(tasks) {
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    tasks.forEach(task => {
        const row = document.createElement("tr");

        let statusHTML = "";

        if (task.status === "Completed") {
            statusHTML = `
                <span class="status-label status-completed">
                    Completed
                </span>
            `;
        } else {
            let options = "";

            if (task.status === "Pending") {
                options = `
                    <option value="In Progress">
                        In Progress
                    </option>
                `;
            }

            if (task.status === "In Progress") {
                options = `
                    <option value="Pending">
                        Pending
                    </option>

                    <option value="Completed">
                        Completed
                    </option>
                `;
            }

            statusHTML = `
                <select
                    class="status-select"
                    data-task-id="${task.id}"
                    aria-label="Change status for task ${task.id}"
                >
                    <option value="${escapeHTML(task.status)}" selected>
                        ${escapeHTML(task.status)}
                    </option>

                    ${options}
                </select>
            `;
        }

        row.innerHTML = `
            <td>${task.id}</td>

            <td>
                <div class="task-title">
                    ${escapeHTML(task.title)}
                </div>

                <div class="task-description">
                    ${escapeHTML(task.description)}
                </div>
            </td>

            <td>${escapeHTML(task.priority)}</td>

            <td>${escapeHTML(task.dueDate)}</td>

            <td>${statusHTML}</td>

            <td>
                <div class="action-buttons">

                    <button
                        class="edit-button"
                        data-action="edit"
                        data-task-id="${task.id}"
                    >
                        Edit
                    </button>

                    <button
                        class="delete-button"
                        data-action="delete"
                        data-task-id="${task.id}"
                    >
                        Delete
                    </button>

                </div>
            </td>
        `;

        taskList.appendChild(row);
    });
}


// -------------------------
// RESET FORM
// -------------------------

function resetForm() {
    taskForm.reset();

    editingTaskId = null;

    formHeading.textContent = "Create New Task";
    submitButton.textContent = "Create Task";

    cancelEditButton.classList.add("hidden");
}


// -------------------------
// EDIT TASK
// -------------------------

function editTask(taskId) {
    const task = tasksCache.find(
        item => item.id === taskId
    );

    if (!task) {
        showMessage("Task not found. Reloading tasks.", "error");
        loadTasks();
        return;
    }

    editingTaskId = task.id;

    document.getElementById("title").value = task.title;

    document.getElementById("description").value =
        task.description;

    document.getElementById("priority").value =
        task.priority;

    document.getElementById("dueDate").value =
        task.dueDate;

    formHeading.textContent = "Edit Task";
    submitButton.textContent = "Update Task";

    cancelEditButton.classList.remove("hidden");

    hideMessage();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// -------------------------
// CREATE OR UPDATE TASK
// -------------------------

taskForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    hideMessage();

    const taskData = {
        title: document.getElementById("title").value.trim(),

        description: document
            .getElementById("description")
            .value.trim(),

        priority: document.getElementById("priority").value,

        dueDate: document.getElementById("dueDate").value
    };

    if (
        !taskData.title ||
        !taskData.description ||
        !taskData.priority ||
        !taskData.dueDate
    ) {
        showMessage("Please fill in all required fields.", "error");
        return;
    }

    const isEditing = editingTaskId !== null;

    const url = isEditing
        ? `${API_URL}/${editingTaskId}`
        : API_URL;

    const method = isEditing ? "PUT" : "POST";

    submitButton.disabled = true;
    submitButton.textContent = isEditing
        ? "Updating..."
        : "Creating...";

    try {
        await apiRequest(url, {
            method: method,

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(taskData)
        });

        resetForm();

        showMessage(
            isEditing
                ? "Task updated successfully."
                : "Task created successfully."
        );

        await loadTasks();

    } catch (error) {
        showMessage(error.message, "error");

    } finally {
        submitButton.disabled = false;

        submitButton.textContent =
            editingTaskId !== null
                ? "Update Task"
                : "Create Task";
    }
});


// -------------------------
// CANCEL EDITING
// -------------------------

cancelEditButton.addEventListener("click", function() {
    resetForm();
    hideMessage();
});


// -------------------------
// EDIT AND DELETE BUTTONS
// -------------------------

taskList.addEventListener("click", async function(event) {

    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const taskId = Number(button.dataset.taskId);

    const action = button.dataset.action;

    if (action === "edit") {
        editTask(taskId);
        return;
    }

    if (action === "delete") {

        const confirmed = confirm(
            "Are you sure you want to delete this task?"
        );

        if (!confirmed) {
            return;
        }

        button.disabled = true;

        try {
            await apiRequest(`${API_URL}/${taskId}`, {
                method: "DELETE"
            });

            if (editingTaskId === taskId) {
                resetForm();
            }

            showMessage("Task deleted successfully.");

            await loadTasks();

        } catch (error) {
            showMessage(error.message, "error");

            button.disabled = false;
        }
    }
});


// -------------------------
// UPDATE TASK STATUS
// -------------------------

taskList.addEventListener("change", async function(event) {

    const select = event.target.closest(
        "select.status-select"
    );

    if (!select) {
        return;
    }

    const taskId = Number(select.dataset.taskId);
    const newStatus = select.value;

    select.disabled = true;

    try {
        await apiRequest(`${API_URL}/${taskId}/status`, {
            method: "PATCH",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                status: newStatus
            })
        });

        showMessage("Task status updated successfully.");

    } catch (error) {
        showMessage(error.message, "error");

    } finally {
        await loadTasks();
    }
});


// -------------------------
// FILTER TASKS
// -------------------------

statusFilter.addEventListener("change", function() {
    hideMessage();
    loadTasks();
});


// -------------------------
// INITIALIZE APPLICATION
// -------------------------

loadTasks();
