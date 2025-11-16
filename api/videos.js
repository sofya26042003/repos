import express from 'express';
const app = express();
const port = process.env.PORT || 4008;

// Константы для валидации
const RESOLUTIONS = ["P144", "P240", "P360", "P480", "P720", "P1080", "P1440", "P2160"];
const MAX_TITLE_LENGTH = 40;
const MAX_AUTHOR_LENGTH = 20;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Вспомогательные функции
function isValidResolution(resolutions) {
    return resolutions.every(res => RESOLUTIONS.includes(res));
}

function isValidDate(dateString) {
    // Проверяем, что это строка и это валидная дата
    if (typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

function validateVideoInput(body, isUpdate = false) {
    const errors = [];

    // Проверка title
    if (!isUpdate && !body.title) {
        errors.push({ message: 'Title is required', field: 'title' });
    } else if (body.title !== undefined) {
        // Добавляем проверку на null и пустую строку
        if (body.title === null || typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.trim().length > MAX_TITLE_LENGTH) {
            errors.push({ message: `Title must be a string under ${MAX_TITLE_LENGTH} characters`, field: 'title' });
        }
    }

    // Проверка author  
    if (!isUpdate && !body.author) {
        errors.push({ message: 'Author is required', field: 'author' });
    } else if (body.author !== undefined) {
        // Добавляем проверку на null и пустую строку
        if (body.author === null || typeof body.author !== 'string' || body.author.trim().length === 0 || body.author.trim().length > MAX_AUTHOR_LENGTH) {
            errors.push({ message: `Author must be a string under ${MAX_AUTHOR_LENGTH} characters`, field: 'author' });
        }
    }

    // Проверка availableResolutions
    if (body.availableResolutions !== undefined) {
        if (!Array.isArray(body.availableResolutions) || !isValidResolution(body.availableResolutions)) {
            errors.push({ message: `Invalid resolutions. Allowed: ${RESOLUTIONS.join(', ')}`, field: 'availableResolutions' });
        }
    }

    // Проверка canBeDownloaded
    if (body.canBeDownloaded !== undefined) {
        if (typeof body.canBeDownloaded !== 'boolean') {
            errors.push({ message: 'canBeDownloaded must be boolean', field: 'canBeDownloaded' });
        }
    }

    // Проверка minAgeRestriction
    if (body.minAgeRestriction !== undefined && body.minAgeRestriction !== null) {
        if (!Number.isInteger(body.minAgeRestriction) || body.minAgeRestriction < 1 || body.minAgeRestriction > 18) {
            errors.push({ message: 'minAgeRestriction must be integer between 1 and 18', field: 'minAgeRestriction' });
        }
    }

    // ИСПРАВЛЕННАЯ проверка publicationDate
    if (isUpdate && body.publicationDate !== undefined) {
        // Проверяем тип и валидность даты
        if (typeof body.publicationDate !== 'string' || !isValidDate(body.publicationDate)) {
            errors.push({ message: 'publicationDate must be valid ISO date', field: 'publicationDate' });
        }
    }

    return errors;
}

// Исходные данные
let videos = [
    {
        id: 1,
        title: 'Test Video 1',
        author: 'Author 1',
        canBeDownloaded: false,
        minAgeRestriction: null,
        createdAt: new Date().toISOString(),
        publicationDate: new Date(Date.now() + 86400000).toISOString(), // +1 день
        availableResolutions: ['P720']
    }
];

// Роуты (БЕЗ ПРЕФИКСОВ!)
app.get('/videos', (req, res) => {
    res.send(videos);
});

app.get('/videos/:id', (req, res) => {
    const video = videos.find(v => v.id === +req.params.id);
    if (!video) return res.sendStatus(404);
    res.send(video);
});

app.delete('/videos/:id', (req, res) => {
    const index = videos.findIndex(v => v.id === +req.params.id);
    if (index === -1) return res.sendStatus(404);
    
    videos.splice(index, 1);
    res.sendStatus(204);
});

app.delete('/testing/all-data', (req, res) => {
    videos = [];
    res.sendStatus(204);
});

app.post('/videos', (req, res) => {
    // Триммируем строки перед валидацией
    if (req.body.title && typeof req.body.title === 'string') {
        req.body.title = req.body.title.trim();
    }
    if (req.body.author && typeof req.body.author === 'string') {
        req.body.author = req.body.author.trim();
    }

    const errors = validateVideoInput(req.body);
    if (errors.length > 0) return res.status(400).send({ errorsMessages: errors });

    const newVideo = {
        id: +new Date(),
        title: req.body.title,
        author: req.body.author,
        canBeDownloaded: req.body.canBeDownloaded || false,
        minAgeRestriction: req.body.minAgeRestriction || null,
        createdAt: new Date().toISOString(),
        publicationDate: new Date(Date.now() + 86400000).toISOString(),
        availableResolutions: req.body.availableResolutions || []
    };

    videos.push(newVideo);
    res.status(201).send(newVideo);
});

app.put('/videos/:id', (req, res) => {
    // Триммируем строки перед валидацией
    if (req.body.title && typeof req.body.title === 'string') {
        req.body.title = req.body.title.trim();
    }
    if (req.body.author && typeof req.body.author === 'string') {
        req.body.author = req.body.author.trim();
    }

    const video = videos.find(v => v.id === +req.params.id);
    if (!video) return res.sendStatus(404);

    const errors = validateVideoInput(req.body, true);
    if (errors.length > 0) return res.status(400).send({ errorsMessages: errors });

    // Обновление полей
    if (req.body.title !== undefined) video.title = req.body.title;
    if (req.body.author !== undefined) video.author = req.body.author;
    if (req.body.availableResolutions !== undefined) video.availableResolutions = req.body.availableResolutions;
    if (req.body.canBeDownloaded !== undefined) video.canBeDownloaded = req.body.canBeDownloaded;
    if (req.body.minAgeRestriction !== undefined) video.minAgeRestriction = req.body.minAgeRestriction;
    if (req.body.publicationDate !== undefined) video.publicationDate = new Date(req.body.publicationDate).toISOString();

    res.sendStatus(204);
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'Video API is working!',
        endpoints: [
            'GET /videos',
            'GET /videos/:id', 
            'POST /videos',
            'PUT /videos/:id',
            'DELETE /videos/:id',
            'DELETE /testing/all-data'
        ]
    });
});

app.options('*', (req, res) => {
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

export default app;