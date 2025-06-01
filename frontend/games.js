document.addEventListener("DOMContentLoaded", () => {
  const gamesContainer = document.getElementById("all-games-container"); // Container in games.html
  const filterCategory = document.getElementById("filter-category"); // We'll add a filter select element

  // Fetch categories from server and populate filter dropdown
  async function fetchCategories() {
    try {
      const response = await fetch("http://localhost:5000/categories");
      const data = await response.json();

      populateCategoryFilter(data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      filterCategory.innerHTML = '<option value="">⚠️ Failed to load categories</option>';
    }
  }

  function populateCategoryFilter(categories) {
    filterCategory.innerHTML = `<option value="">All</option>`;
    categories.forEach(cat => {
      filterCategory.innerHTML += `<option value="${cat.category}">${cat.category}</option>`;
    });
  }

  // Fetch and display games, optionally filtered by category
  async function fetchGames() {
    try {
      const response = await fetch("http://localhost:5000/games");
      const data = await response.json();

      const selectedCategory = filterCategory.value;

      // Filter games by category if filter applied
      const filteredGames = selectedCategory
        ? data.games.filter(game => game.category === selectedCategory)
        : data.games;

      gamesContainer.innerHTML = ""; // Clear container

      if (filteredGames.length === 0) {
        gamesContainer.innerHTML = "<p>No games found for selected category.</p>";
        return;
      }

      filteredGames.forEach(game => {
        const gameElement = document.createElement("div");
        gameElement.classList.add("game-item");

        const thumbnailUrl = game.thumbnail
          ? `http://localhost:5000/uploads/${game.thumbnail}`
          : "default-thumbnail.jpg";

        gameElement.innerHTML = `
          <img src="${thumbnailUrl}" alt="Thumbnail for ${game.name}" width="200" height="150" />
          <h3>${game.name}</h3>
          <p>${game.description || "No description available."}</p>
          <p><strong>Category:</strong> ${game.category || "Uncategorized"}</p>
          <button class="play-btn" data-filename="${game.filename}">Play</button>
        `;

        gamesContainer.appendChild(gameElement);
      });

      // Add play button event listeners
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

  // When category filter changes, reload games
  filterCategory.addEventListener("change", fetchGames);

  // Initial load
  fetchCategories().then(fetchGames);
});
