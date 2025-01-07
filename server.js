const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = 10000;

// MongoDB Connection URL
const mongoUrl = "mongodb+srv://tammai488:123456789Do@listworking.lytld.mongodb.net/?retryWrites=true&w=majority&appName=ListWorking";
const dbName = "taskManager";
let db;

// เชื่อมต่อ MongoDB
async function connectToMongo() {
    try {
        const client = await MongoClient.connect(mongoUrl);
        db = client.db(dbName);
        console.log("Connected to MongoDB successfully");
    } catch (error) {
        console.error("Could not connect to MongoDB:", error);
    }
}
connectToMongo();

// Add request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

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

// API endpoints
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await db.collection('tasks').find().toArray();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const newTask = {
            priority: req.body.priority || 'medium',
            category: req.body.category || 'uncategorized',
            createdAt: new Date().toISOString(),
            ...req.body
        };
        const result = await db.collection('tasks').insertOne(newTask);
        res.json({ ...newTask, _id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/submit', upload.array('files'), async (req, res) => {
    try {
        console.log('Received file upload request:', {
            files: req.files,
            body: req.body,
            taskId: req.body.taskId
        });

        if (!req.files || req.files.length === 0) {
            console.log('No files uploaded');
            return res.status(400).json({ error: 'กรุณาเลือกไฟล์' });
        }

        const taskId = req.body.taskId;
        
        if (!taskId || taskId === 'undefined' || taskId === '') {
            if (req.files && Array.isArray(req.files)) {
                for (const file of req.files) {
                    const oldFilePath = path.join(__dirname, 'uploads', file.filename);
                    try {
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    } catch (err) {
                        console.error('Error deleting old file:', err);
                    }
                }
            }
            return res.status(400).json({ error: 'กรุณาเลือกงาน' });
        }

        if (!ObjectId.isValid(taskId)) {
            if (req.files && Array.isArray(req.files)) {
                for (const file of req.files) {
                    const oldFilePath = path.join(__dirname, 'uploads', file.filename);
                    try {
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    } catch (err) {
                        console.error('Error deleting old file:', err);
                    }
                }
            }
            return res.status(400).json({ error: 'รูปแบบ ID ไม่ถูกต้อง' });
        }

        const task = await db.collection('tasks').findOne({ _id: new ObjectId(taskId) });
        console.log('Found task:', task);

        if (!task) {
            if (req.files && Array.isArray(req.files)) {
                for (const file of req.files) {
                    const oldFilePath = path.join(__dirname, 'uploads', file.filename);
                    try {
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    } catch (err) {
                        console.error('Error deleting old file:', err);
                    }
                }
            }
            return res.status(404).json({ error: 'ไม่พบงานที่เลือก' });
        }

        // ลบไฟล์เก่าถ้ามี
        if (task.files && Array.isArray(task.files)) {
            for (const file of task.files) {
                const oldFilePath = path.join(__dirname, 'uploads', file.filename);
                try {
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                } catch (err) {
                    console.error('Error deleting old file:', err);
                }
            }
        }
        
        // บันทึกข้อมูลไฟล์ใหม่
        const filesData = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        }));

        await db.collection('tasks').updateOne(
            { _id: new ObjectId(taskId) },
            { 
                $set: { 
                    status: 'completed',
                    files: filesData,
                    submittedAt: new Date().toISOString()
                }
            }
        );
        res.json({ success: true, files: filesData });
    } catch (error) {
        console.error('Error in /api/submit:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    res.download(filePath, (err) => {
        if (err) {
            res.status(404).send('File not found');
        }
    });
});

// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const result = await db.collection('tasks').updateOne(
            { _id: new ObjectId(taskId) },
            { $set: req.body }
        );
        
        if (result.matchedCount > 0) {
            const updatedTask = await db.collection('tasks').findOne({ _id: new ObjectId(taskId) });
            res.json(updatedTask);
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const task = await db.collection('tasks').findOne({ _id: new ObjectId(taskId) });
        
        if (task) {
            // ลบไฟล์ที่เกี่ยวข้องถ้ามี
            if (task.files && Array.isArray(task.files)) {
                for (const file of task.files) {
                    const filePath = path.join(__dirname, 'uploads', file.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            }
            
            await db.collection('tasks').deleteOne({ _id: new ObjectId(taskId) });
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const tasks = await db.collection('tasks').find().toArray();
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// เพิ่ม CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
}); 