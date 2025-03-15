const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/oilwells', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String,
});

const ReportSchema = new mongoose.Schema({
    title: String,
    content: String,
    pressure: Number, // Давление
    wellStatus: String, // Состояние скважины
    temperature: Number, // Температура
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    well: { type: mongoose.Schema.Types.ObjectId, ref: 'Well' }, // Ссылка на скважину
    createdAt: { type: Date, default: Date.now },
});

const WellSchema = new mongoose.Schema({
    name: String,
    location: String,
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const Report = mongoose.model('Report', ReportSchema);
const Well = mongoose.model('Well', WellSchema);

// Middleware для проверки токена и роли
const authenticateAndAuthorize = (requiredRole) => async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).send('Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, 'secret_key');
        if (requiredRole && decoded.role !== requiredRole) {
            return res.status(403).send('Access denied. You are not authorized.');
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).send('Invalid token.');
    }
};

// Регистрация пользователя
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).send('All fields are required.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, role });
        await user.save();
        res.status(201).send('User registered');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user');
    }
});

// Авторизация пользователя
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ userId: user._id, role: user.role }, 'secret_key');
            res.json({ token, role: user.role });
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Error logging in');
    }
});

// Создание отчета
app.post('/reports', authenticateAndAuthorize('operator'), async (req, res) => {
    const { title, content, pressure, wellStatus, temperature, well } = req.body;

    if (!title || !content || !pressure || !wellStatus || !temperature || !well) {
        return res.status(400).send('All fields are required.');
    }

    try {
        const report = new Report({
            title,
            content,
            pressure,
            wellStatus,
            temperature,
            well,
            createdBy: req.user.userId,
        });
        await report.save();
        res.status(201).send('Report added');
    } catch (error) {
        console.error('Error adding report:', error);
        res.status(500).send('Error adding report');
    }
});

// Получение всех отчетов
app.get('/reports', authenticateAndAuthorize(), async (req, res) => {
    try {
        const reports = await Report.find().populate('createdBy', 'username').populate('well', 'name');
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).send('Error fetching reports');
    }
});

// Создание скважины
app.post('/wells', authenticateAndAuthorize('admin'), async (req, res) => {
    const { name, location } = req.body;

    if (!name || !location) {
        return res.status(400).send('All fields are required.');
    }

    try {
        const well = new Well({ name, location });
        await well.save();
        res.status(201).send('Well created');
    } catch (error) {
        console.error('Error creating well:', error);
        res.status(500).send('Error creating well');
    }
});

// Получение всех скважин
app.get('/wells', authenticateAndAuthorize(), async (req, res) => {
    try {
        const wells = await Well.find();
        res.json(wells);
    } catch (error) {
        console.error('Error fetching wells:', error);
        res.status(500).send('Error fetching wells');
    }
});

// Удаление скважины
app.delete('/wells/:id', authenticateAndAuthorize('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        const well = await Well.findByIdAndDelete(id);
        if (!well) {
            return res.status(404).send('Well not found.');
        }
        res.status(200).send('Well deleted');
    } catch (error) {
        console.error('Error deleting well:', error);
        res.status(500).send('Error deleting well');
    }
});

// Удаление отчета
app.delete('/reports/:id', authenticateAndAuthorize('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        const report = await Report.findByIdAndDelete(id);
        if (!report) {
            return res.status(404).send('Report not found.');
        }
        res.status(200).send('Report deleted');
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).send('Error deleting report');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Получение всех отчетов с пагинацией
app.get('/reports', authenticateAndAuthorize(), async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const skip = (page - 1) * limit;

    try {
        const reports = await Report.find()
            .populate('createdBy', 'username')
            .populate('well', 'name')
            .skip(skip)
            .limit(limit);
        const totalReports = await Report.countDocuments();
        res.json({
            reports,
            totalPages: Math.ceil(totalReports / limit),
            currentPage: page,
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).send('Error fetching reports');
    }
});