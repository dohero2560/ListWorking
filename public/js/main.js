document.addEventListener('DOMContentLoaded', () => {
    loadTasks();

    // จัดการการเพิ่มงานใหม่
    document.getElementById('taskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const task = {
            name: document.getElementById('taskName').value,
            description: document.getElementById('taskDescription').value,
            deadline: document.getElementById('deadline').value,
            status: 'pending'
        };

        const editId = e.target.dataset.editId;
        const url = editId ? `/api/tasks/${editId}` : '/api/tasks';
        const method = editId ? 'PUT' : 'POST';

        await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        });

        // รีเซ็ตฟอร์มกลับสู่โหมดเพิ่มงาน
        e.target.reset();
        delete e.target.dataset.editId;
        document.querySelector('.add-task h2').textContent = 'เพิ่มงานใหม่';
        document.querySelector('#taskForm button').textContent = 'เพิ่มงาน';

        loadTasks();
    });

    // จัดการการส่งงาน
    document.getElementById('submitForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('taskId', document.getElementById('taskSelect').value);
        formData.append('file', document.getElementById('workFile').files[0]);

        await fetch('/api/submit', {
            method: 'POST',
            body: formData
        });

        loadTasks();
        e.target.reset();
    });
});

async function loadStats() {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    
    document.getElementById('taskStats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>งานทั้งหมด</h3>
                <p>${stats.total}</p>
            </div>
            <div class="stat-card">
                <h3>เสร็จสิ้น</h3>
                <p>${stats.completed}</p>
            </div>
            <div class="stat-card">
                <h3>รอดำเนินการ</h3>
                <p>${stats.pending}</p>
            </div>
        </div>
    `;
}

async function loadTasks() {
    const response = await fetch('/api/tasks');
    const tasks = await response.json();
    
    const tasksDiv = document.getElementById('tasks');
    const taskSelect = document.getElementById('taskSelect');
    
    tasksDiv.innerHTML = '';
    taskSelect.innerHTML = '<option value="">เลือกงาน</option>';

    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item priority-${task.priority} ${task.status === 'completed' ? 'completed' : ''}`;
        taskElement.innerHTML = `
            <div class="task-header">
                <h3>${task.name}</h3>
                <div class="task-buttons">
                    ${task.status === 'pending' ? `
                        <button class="edit-btn" onclick="editTask('${task.id}', '${task.name}', '${task.description}', '${task.deadline}')">
                            แก้ไข
                        </button>
                    ` : `
                        <button class="reupload-btn" onclick="reuploadFile('${task.id}', '${task.name}')">
                            อัพโหลดใหม่
                        </button>
                    `}
                    <button class="delete-btn" onclick="deleteTask('${task.id}', '${task.name}')">ลบ</button>
                </div>
            </div>
            <p>${task.description}</p>
            <p>กำหนดส่ง: ${task.deadline}</p>
            <p>สถานะ: ${task.status === 'completed' ? 'เสร็จสิ้น' : 'รอดำเนินการ'}</p>
            <p>หมวดหมู่: ${task.category}</p>
            <p>ความสำคัญ: ${task.priority}</p>
            <p>สร้างเมื่อ: ${new Date(task.createdAt).toLocaleString()}</p>
            ${task.file ? `<p>ไฟล์งาน: <a href="/uploads/${task.file}" target="_blank">${task.file}</a></p>` : ''}
        `;
        tasksDiv.appendChild(taskElement);

        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        taskSelect.appendChild(option);
    });
    
    await loadStats();
}

// เพิ่มฟังก์ชันสำหรับแก้ไขงาน
function editTask(id, name, description, deadline) {
    document.getElementById('taskName').value = name;
    document.getElementById('taskDescription').value = description;
    document.getElementById('deadline').value = deadline;
    
    // เปลี่ยนฟอร์มให้เป็นโหมดแก้ไข
    const form = document.getElementById('taskForm');
    form.dataset.editId = id;
    document.querySelector('.add-task h2').textContent = 'แก้ไขงาน';
    document.querySelector('#taskForm button').textContent = 'บันทึกการแก้ไข';
}

// เพิ่มฟังก์ชันสำหรับอัพโหลดไฟล์ใหม่
function reuploadFile(taskId, taskName) {
    document.getElementById('taskSelect').value = taskId;
    document.getElementById('workFile').click();
    document.getElementById('submitForm').scrollIntoView({ behavior: 'smooth' });
}

// เพิ่มฟังก์ชันสำหรับลบงาน
async function deleteTask(id, name) {
    if (confirm(`คุณต้องการลบงาน "${name}" ใช่หรือไม่?`)) {
        await fetch(`/api/tasks/${id}`, {
            method: 'DELETE'
        });
        loadTasks();
    }
} 