const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());

// กำหนดการจัดเก็บไฟล์
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// อ่านข้อมูลงาน
function getTasks() {
    try {
        const data = fs.readFileSync('data/tasks.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// บันทึกข้อมูลงาน
function saveTasks(tasks) {
    fs.writeFileSync('data/tasks.json', JSON.stringify(tasks, null, 2));
}

// API endpoints
app.get('/api/tasks', (req, res) => {
    const tasks = getTasks();
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
    const tasks = getTasks();
    const newTask = {
        id: Date.now().toString(),
        priority: req.body.priority || 'medium',
        category: req.body.category || 'uncategorized',
        createdAt: new Date().toISOString(),
        ...req.body
    };
    tasks.push(newTask);
    saveTasks(tasks);
    res.json(newTask);
});

app.post('/api/submit', upload.single('file'), (req, res) => {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === req.body.taskId);
    if (task) {
        // ลบไฟล์เก่าถ้ามี
        if (task.file) {
            const oldFilePath = path.join(__dirname, 'uploads', task.file);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }
        task.status = 'completed';
        task.file = req.file.filename;
        saveTasks(tasks);
    }
    res.json({ success: true });
});

// เพิ่ม route สำหรับดาวน์โหลดไฟล์
app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    res.download(filePath, (err) => {
        if (err) {
            res.status(404).send('File not found');
        }
    });
});

// สร้างโฟลเดอร์ที่จำเป็น
['data', 'uploads'].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

// เพิ่ม endpoint สำหรับแก้ไขงาน
app.put('/api/tasks/:id', (req, res) => {
    const tasks = getTasks();
    const taskId = req.params.id;
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...req.body,
            id: taskId // คงค่า id เดิมไว้
        };
        saveTasks(tasks);
        res.json(tasks[taskIndex]);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// เพิ่ม endpoint สำหรับลบงาน
app.delete('/api/tasks/:id', (req, res) => {
    const tasks = getTasks();
    const taskId = req.params.id;
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        // ลบไฟล์ที่เกี่ยวข้องถ้ามี
        if (task.file) {
            const filePath = path.join(__dirname, 'uploads', task.file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        // ลบงานออกจาก array
        tasks.splice(taskIndex, 1);
        saveTasks(tasks);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// Add endpoint for task statistics
app.get('/api/stats', (req, res) => {
    const tasks = getTasks();
    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        byCategory: tasks.reduce((acc, task) => {
            acc[task.category] = (acc[task.category] || 0) + 1;
            return acc;
        }, {}),
        byPriority: tasks.reduce((acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
        }, {})
    };
    res.json(stats);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
}); 