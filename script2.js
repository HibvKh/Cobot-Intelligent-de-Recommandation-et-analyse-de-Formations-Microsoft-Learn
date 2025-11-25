document.addEventListener('DOMContentLoaded', () => {
    const recommendationOutput = document.getElementById('recommendation-output');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const pageInfo = document.getElementById('page-info');
    const levelsFilterCheckboxes = document.getElementById('levels-filter-checkboxes');
    const typesFilterCheckboxes = document.getElementById('types-filter-checkboxes');
    const updateAnalyticsButton = document.getElementById('update-analytics-button');
    const kpisOutput = document.getElementById('kpis-output');
    const dataPreviewOutput = document.getElementById('data-preview-output');

    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const discoverCobotButton = document.getElementById('discover-cobot-button');

    // Chatbot elements (for chatbot.html)
    const chatUserInput = document.getElementById('chat-user-input');
    const chatSubmitButton = document.getElementById('chat-submit-button');
    const chatMessagesContainer = document.querySelector('.chat-messages');

    // --- Tab Navigation (Main Sections) ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1); // Remove '#'
            
            navLinks.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            link.classList.add('active');
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.classList.add('active');
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- Discover Cobot Button on Home Page ---
    // The discoverCobotButton is no longer directly navigating to a demo section,
    // but rather to the chatbot.html page, so this event listener is no longer needed
    // as the button is now an <a> tag.
    // if (discoverCobotButton) {
    //     discoverCobotButton.addEventListener('click', () => {
    //         tabContents.forEach(tab => tab.classList.remove('active'));
    //         document.getElementById('demo-section').classList.add('active');
    //         navLinks.forEach(nav => nav.classList.remove('active'));
    //     });
    // }

    // --- Fetch Filters for Dashboard ---
    async function fetchFilters() {
        try {
            const response = await fetch('/api/filters');
            const data = await response.json();
            console.log("DEBUG: Filters data received:", data); // Added log
            
            levelsFilterCheckboxes.innerHTML = '';
            data.levels.forEach(level => {
                levelsFilterCheckboxes.innerHTML += `
                    <label>
                        <input type="checkbox" name="level" value="${level}">
                        ${level}
                    </label>
                `;
            });

            typesFilterCheckboxes.innerHTML = '';
            data.types.forEach(type => {
            typesFilterCheckboxes.innerHTML += `
                    <label>
                        <input type="checkbox" name="type" value="${type}">
                        ${type}
                    </label>
                `;
            });
        } catch (error) {
            console.error('Error fetching filters:', error);
            // alert('Failed to load dashboard filters.'); // Removed alert for smoother UX
        }
    }

    // --- Render Recommendations ---
    function renderRecommendations(recommendations) {
        if (recommendations.length === 0) {
            recommendationOutput.innerHTML = "<p>Aucun résultat précis trouvé. Essayez d'élargir la requête (moins de filtres).</p>";
            return;
        }
        recommendationOutput.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item">
                <h4>${rec.title}</h4>
                <div class="details">
                    <b>Type :</b> ${rec.type} • 
                    <b>Niveau :</b> ${rec.level} • 
                    <b>Rôles :</b> ${rec.roles} • 
                    <b>Produits :</b> ${rec.products} • 
                    <b>Durée :</b> ${rec.duration} • 
                    <b>Popularité :</b> ${rec.popularity} • 
                    <b>Statut :</b> ${rec.certified_status}
                </div>
                <p class="summary">${rec.summary}</p>
                <a href="${rec.url}" target="_blank" class="link">
                    <i class="fas fa-external-link-alt"></i> Ouvrir la formation
                </a>
            </div>
        `).join('');
    }

    // --- Render KPIs ---
    function renderKPIs(kpis) {
        kpisOutput.innerHTML = `
            <div><b>Total items:</b> <p>${kpis.total_items}</p></div>
            <div><b>Durée totale (heures):</b> <p>${kpis.total_duration_hours}</p></div>
            <div><b>Popularité moyenne:</b> <p>${kpis.avg_popularity}</p></div>
            <div><b>% Certifiés:</b> <p>${kpis.certified_percentage}</p></div>
        `;
    }

    // --- Render Charts ---
    function renderCharts(charts) {
        for (const chartKey in charts) {
            const chartData = JSON.parse(charts[chartKey]);
            const chartDiv = document.getElementById(`${chartKey}-output`);
            if (chartDiv) {
                Plotly.newPlot(chartDiv, chartData.data, chartData.layout);
            }
        }
    }

    // --- Render Data Preview ---
    function renderDataPreview(dataPreview) {
        if (dataPreview.length === 0) {
            dataPreviewOutput.innerHTML = "<p>No data to display.</p>";
            return;
        }

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create table header
        const headers = Object.keys(dataPreview[0]);
        thead.innerHTML = `<tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>`;
        table.appendChild(thead);

        // Create table body
        dataPreview.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = headers.map(header => `<td>${row[header]}</td>`).join('');
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        dataPreviewOutput.innerHTML = '';
        dataPreviewOutput.appendChild(table);
    }

    // --- Chatbot Functionality ---
    if (chatSubmitButton && chatUserInput && chatMessagesContainer) {
        chatSubmitButton.addEventListener('click', sendMessage);
        chatUserInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    let lastChatQuery = ''; // Store the last chat query for pagination

    async function sendMessage(page = 1) {
        const userMessage = chatUserInput.value.trim();
        if (userMessage === '' && page === 1) return; // Only block if no message and not a pagination request

        if (page === 1) { // Only append user message if it's a new query, not pagination
            appendMessage(userMessage, 'user-message');
            lastChatQuery = userMessage; // Store the new query
            chatUserInput.value = '';
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: lastChatQuery, // Always send the last stored query
                    page: page,
                    items_per_page: itemsPerPage
                }),
            });
            const data = await response.json();

            if (page === 1) { // Only append bot's initial response for new queries
                appendMessage(data.message, 'bot-message');
            }
            
            if (data.recommendations && data.recommendations.length > 0) {
                renderRecommendations(data.recommendations);
            } else {
                recommendationOutput.innerHTML = "<p>Aucune recommandation trouvée pour cette requête.</p>";
            }
            updatePagination(data.total_pages, data.current_page);

        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage('Désolé, je n\'ai pas pu traiter votre demande pour le moment.', 'bot-message');
        }
    }

    function appendMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        messageDiv.textContent = text;
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Scroll to bottom
    }

    // --- Pagination for Chatbot Recommendations ---
    let currentPage = 1;
    let totalPages = 1; // Initialize totalPages
    const itemsPerPage = 10; // As requested, 10 results per page

    function updatePagination(newTotalPages, newCurrentPage) {
        currentPage = newCurrentPage;
        totalPages = newTotalPages;
        pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === totalPages;
    }

    if (prevButton && nextButton) { // Ensure pagination buttons exist
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                sendMessage(currentPage - 1);
            }
        });

        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                sendMessage(currentPage + 1);
            }
        });
    }


    // Initial load: Ensure filters are loaded for the dashboard if elements exist
    if (levelsFilterCheckboxes && typesFilterCheckboxes) {
        fetchFilters();
        // Also load initial analytics data when dashboard is loaded
        updateAnalytics();
    }

    // Event listener for updating analytics
    if (updateAnalyticsButton) {
        updateAnalyticsButton.addEventListener('click', updateAnalytics);
    }

    async function updateAnalytics() {
        const selectedLevels = Array.from(levelsFilterCheckboxes.querySelectorAll('input[name="level"]:checked')).map(cb => cb.value);
        const selectedTypes = Array.from(typesFilterCheckboxes.querySelectorAll('input[name="type"]:checked')).map(cb => cb.value);

        try {
            const response = await fetch('/api/recommendations', { // This endpoint also provides analytics
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    levels_filter: selectedLevels,
                    types_filter: selectedTypes,
                    query: "" // No query for pure analytics
                }),
            });
            const data = await response.json();
            console.log("DEBUG: Analytics data received:", data); // Log received data
            console.log("DEBUG: KPIs data:", data.kpis); // Added log
            console.log("DEBUG: Charts data:", data.charts); // Added log
            console.log("DEBUG: Data preview data:", data.data_preview); // Added log

            renderKPIs(data.kpis);
            renderCharts(data.charts);
            renderDataPreview(data.data_preview);

        } catch (error) {
            console.error('Error fetching analytics:', error);
            // Handle error display
        }
    }
});

function renderCharts(charts) {
    console.log("DEBUG: Charts object received by renderCharts (JSON stringified):", JSON.stringify(charts, null, 2)); // Added new log with stringify
    for (const chartKey in charts) {
        try {
            const chartData = JSON.parse(charts[chartKey]);
            const chartDiv = document.getElementById(`${chartKey}-output`);
            if (chartDiv) {
                console.log(`DEBUG: Rendering chart ${chartKey} in ${chartDiv.id}`); // Log chart rendering
                console.log(`DEBUG: Chart ${chartKey} data:`, chartData.data); // Added detailed log
                console.log(`DEBUG: Chart ${chartKey} layout:`, chartData.layout); // Added detailed log
                Plotly.newPlot(chartDiv, chartData.data, chartData.layout);
            } else {
                console.error(`ERROR: Chart container ${chartKey}-output not found.`);
            }
        } catch (e) {
            console.error(`ERROR: Failed to parse chart data for ${chartKey}:`, e);
            console.error(`Raw chart data for ${chartKey}:`, charts[chartKey]);
        }
    }
}
