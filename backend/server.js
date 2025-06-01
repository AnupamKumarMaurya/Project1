const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const extract = require("extract-zip");
const pool = require("./db");

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded games and assets
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Handle zip + thumbnail uploads
const gameUpload = upload.fields([
    { name: "gameFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
]);

// Upload route
app.post("/upload", gameUpload, async (req, res) => {
    try {
        const { name, description, category } = req.body;
        const gameFile = req.files?.gameFile?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        if (!name || !category || !gameFile || !thumbnailFile) {
            return res.status(400).json({ error: "Missing required fields or files." });
        }

        const filename = gameFile.filename;
        const thumbnail = thumbnailFile.filename;
        const gameFolder = path.join(uploadDir, filename.split(".")[0]);

        if (!fs.existsSync(gameFolder)) fs.mkdirSync(gameFolder);

        // Extract ZIP
        if (gameFile.mimetype.includes("zip")) {
            await extract(gameFile.path, { dir: gameFolder });

            // If extracted ZIP contains a single folder, flatten it
            const extractedItems = fs.readdirSync(gameFolder);
            if (extractedItems.length === 1) {
                const onlyFolder = path.join(gameFolder, extractedItems[0]);
                if (fs.statSync(onlyFolder).isDirectory()) {
                    fs.readdirSync(onlyFolder).forEach(file => {
                        fs.renameSync(path.join(onlyFolder, file), path.join(gameFolder, file));
                    });
                    fs.rmdirSync(onlyFolder);
                }
            }

            // Delete original ZIP file
            fs.unlinkSync(gameFile.path);
        }

        // Insert into Games table
        const result = await pool.query(`
            INSERT INTO "Games" (name, description, filename, thumbnail, category)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `, [name, description, filename.split(".")[0], thumbnail, category]);

        // Update CategoryCounts
        await pool.query(`
            INSERT INTO "CategoryCounts" (category, count)
            VALUES ($1, 1)
            ON CONFLICT (category) DO UPDATE
            SET count = "CategoryCounts".count + 1;
        `, [category]);

        res.status(200).json({ game: result.rows[0] });

    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Error uploading game." });
    }
});

// Get all games
app.get("/games", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "Games" ORDER BY id DESC');
        res.status(200).json({ games: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get games by category
app.get("/games/category/:category", async (req, res) => {
    const { category } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM "Games" WHERE category = $1 ORDER BY id DESC',
            [category]
        );
        res.status(200).json({ games: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get category counts
app.get("/categories", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "CategoryCounts" ORDER BY category ASC');
        res.status(200).json({ categories: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Server test route
app.get("/", (req, res) => {
    res.json({ message: "🎮 Game upload server is running!" });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
