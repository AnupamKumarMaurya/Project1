document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("upload-form");
    const gamesContainer = document.getElementById("games-container");
    const categorySelect = document.getElementById("category");

    // Fetch and display category list
    async function fetchCategories() {
        try {
            const response = await fetch("http://localhost:5000/categories");
            const data = await response.json();

            categorySelect.innerHTML = '<option value="">--Select Category--</option>';
            data.categories.forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat.category}">${cat.category} (${cat.count})</option>`;
            });
        } catch (error) {
            console.error("Error fetching categories:", error);
            categorySelect.innerHTML = '<option value="">⚠️ Failed to load categories</option>';
        }
    }

    // Fetch and display uploaded games
  async function fetchGames() {
    try {
        const response = await fetch("http://localhost:5000/games");
        const data = await response.json();

        gamesContainer.innerHTML = ""; // Clear previous games

        if (!data.games.length) {
            gamesContainer.innerHTML = "<p>No games uploaded yet.</p>";
            return;
        }

        // Optional: filter by selected category (if you have filter dropdown)
        const selectedCategory = filterCategory?.value;
        let filteredGames = selectedCategory
            ? data.games.filter(game => game.category === selectedCategory)
            : data.games;

        // Only show the latest 4 games
        filteredGames = filteredGames.slice(0, 4);

        filteredGames.forEach(game => {
            const gameElement = document.createElement("div");
            gameElement.classList.add("game-item");

            const thumbnailUrl = game.thumbnail
                ? `http://localhost:5000/uploads/${game.thumbnail}`
                : "default-thumbnail.jpg"; // fallback thumbnail

            gameElement.innerHTML = `
                <img src="${thumbnailUrl}" alt="Thumbnail for ${game.name}" width="200" height="150" />
                <h3>${game.name}</h3>
                <p>${game.description || "No description available."}</p>
                <p><strong>Category:</strong> ${game.category || "Uncategorized"}</p>
                <button class="play-btn" data-filename="${game.filename}">Play</button>
            `;

            gamesContainer.appendChild(gameElement);
        });

        // Play button event
        document.querySelectorAll('.play-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const filename = event.target.getAttribute('data-filename');
                const gameUrl = `http://localhost:5000/uploads/${filename}/index.html`;
                window.open(gameUrl, "_blank");
            });
        });

    } catch (error) {
        console.error("Error fetching games:", error);
        gamesContainer.innerHTML = "<p>❌ Could not load games. Please try again later.</p>";
    }
}


    // Handle game upload
    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("game-name").value.trim();
        const description = document.getElementById("game-description").value.trim();
        const category = categorySelect.value;
        const gameFile = document.getElementById("game-file").files[0];
        const thumbnail = document.getElementById("thumbnail-file").files[0];

        if (!name || !category || !gameFile || !thumbnail) {
            alert("❗ Please fill all required fields including category and thumbnail.");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("gameFile", gameFile);
        formData.append("thumbnail", thumbnail);

        try {
            const response = await fetch("http://localhost:5000/upload", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Upload failed.");
            }

            alert("✅ Game uploaded successfully!");
            uploadForm.reset();
            fetchGames(); // Refresh game list
        } catch (error) {
            console.error("Upload error:", error);
            alert("❌ Error uploading game. Please try again.");
        }
    });

    // Initial fetch
    fetchCategories();
    fetchGames();
    const filterCategory = document.getElementById("filter-category");

function populateCategoryFilter(categories) {
  filterCategory.innerHTML = `<option value="">All</option>`;
  categories.forEach(cat => {
    filterCategory.innerHTML += `<option value="${cat.category}">${cat.category}</option>`;
  });
  filterCategory.addEventListener("change", fetchGames);
}

// In fetchCategories(), call this:
populateCategoryFilter(data.categories);

// In fetchGames():
const selectedCategory = filterCategory.value;
const filteredGames = selectedCategory
  ? data.games.filter(game => game.category === selectedCategory)
  : data.games;

});
