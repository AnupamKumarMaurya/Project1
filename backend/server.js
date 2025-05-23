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
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded games

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Save uploaded files to 'uploads' directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use a timestamp for unique file names
    },
});
const upload = multer({ storage: storage });

// Expect two files: gameFile (ZIP) and thumbnail (JPG)
const gameUpload = upload.fields([
    { name: "gameFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
]);


// Upload and extract game file
app.post("/upload", gameUpload, async (req, res) => {
    try {
        const { name, description, category } = req.body;

        if (!name || !category) {
            return res.status(400).json({ error: "Game name and category are required." });
        }

        const gameFile = req.files["gameFile"]?.[0];
        const thumbnailFile = req.files["thumbnail"]?.[0];

        if (!gameFile) {
            return res.status(400).json({ error: "No game file uploaded." });
        }

        const filename = gameFile.filename;
        const thumbnail = thumbnailFile ? thumbnailFile.filename : null;
        const gameFolder = path.join(__dirname, "uploads", filename.split(".")[0]);

        if (!fs.existsSync(gameFolder)) {
            fs.mkdirSync(gameFolder);
        }

        // Extract game ZIP
        if (gameFile.mimetype.includes("zip")) {
            await extract(gameFile.path, { dir: gameFolder });

            const extractedFiles = fs.readdirSync(gameFolder);
            if (extractedFiles.length === 1) {
                const onlyFolder = path.join(gameFolder, extractedFiles[0]);
                if (fs.statSync(onlyFolder).isDirectory()) {
                    fs.readdirSync(onlyFolder).forEach((file) => {
                        fs.renameSync(path.join(onlyFolder, file), path.join(gameFolder, file));
                    });
                    fs.rmdirSync(onlyFolder);
                }
            }

            fs.unlinkSync(gameFile.path);
                    }

        // Save game info to database
        const result = await pool.query(
`            INSERT INTO "Games" (name, description, filename, thumbnail, category) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description, filename.split(".")[0], thumbnail, category]
        );

        // Update CategoryCounts (insert if not exists)
        await pool.query(`
            INSERT INTO "CategoryCounts" (category, count)
            VALUES ($1, 1)
            ON CONFLICT (category) DO UPDATE SET count = "CategoryCounts".count + 1
        `, [category]);

        res.status(200).json({ game: result.rows[0] });

    } catch (error) {
        console.error("Error uploading game:", error);
        res.status(500).json({ error: error.message });
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

// ✅ NEW: Get games by category
app.get("/games/category/:category", async (req, res) => {
    const category = req.params.category;
    try {
        const result = await pool.query(
            `SELECT * FROM "Games" WHERE category = $1 ORDER BY id DESC`,
            [category]
        );
        res.status(200).json({ games: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ NEW: Get all category counts
app.get("/categories", async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM "CategoryCounts"`);
        res.status(200).json({ categories: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Server setup
app.listen(5000, () => console.log("✅ Server running on port 5000"));

app.get("/", (req, res) => {
    res.json({ message: "Server is running!" });
}); 