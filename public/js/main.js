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

    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close');
    
    // ปิด modal เมื่อคลิกที่ปุ่ม close
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    }
    
    // ปิด modal เมื่อคลิกนอกพื้นที่ modal
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
    
    // จัดการการส่งฟอร์มแก้ไข
    document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskId = e.target.dataset.taskId;
        
        const task = {
            name: document.getElementById('editTaskName').value,
            description: document.getElementById('editTaskDescription').value,
            deadline: document.getElementById('editDeadline').value,
            priority: document.getElementById('editTaskPriority').value,
            category: document.getElementById('editTaskCategory').value,
            status: 'pending'
        };
        
        // ส่งข้อมูลไปอัพเดท
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        });
        
        // ปิด modal และโหลดข้อมูลใหม่
        modal.style.display = 'none';
        loadTasks();
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
                        <button class="edit-btn" onclick="editTask('${task.id}', '${task.name}', '${task.description}', '${task.deadline}', '${task.priority}', '${task.category}')">
                            <i class="fas fa-edit"></i> แก้ไข
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

// แก้ไขฟังก์ชัน editTask ให้ใช้ modal
function editTask(id, name, description, deadline, priority, category) {
    // เรียก modal
    const modal = document.getElementById('editModal');
    
    // กำหนดค่าให้ฟอร์มใน modal
    document.getElementById('editTaskName').value = name;
    document.getElementById('editTaskDescription').value = description;
    document.getElementById('editDeadline').value = deadline;
    document.getElementById('editTaskPriority').value = priority;
    document.getElementById('editTaskCategory').value = category;
    
    // เก็บ ID ไว้สำหรับการอัพเดท
    document.getElementById('editTaskForm').dataset.taskId = id;
    
    // แสดง modal
    modal.style.display = 'block';
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