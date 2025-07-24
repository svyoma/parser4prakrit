// Global variables to store the current analysis
let currentAnalysis = null;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    initializeTabs();
});

function initializeForm() {
    const form = document.getElementById('form');
    const submitBtn = document.getElementById('submit-btn');
    const loader = document.getElementById('loader');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loader
        submitBtn.disabled = true;
        loader.style.display = 'block';
        submitBtn.querySelector('span').style.opacity = '0';
        
        try {
            const verbForm = document.getElementById('verb-form').value;
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `verb_form=${encodeURIComponent(verbForm)}`
            });
            
            const data = await response.json();
            
            if (data.error) {
                showToast(data.error, 'error');
                if (data.suggestions) {
                    data.suggestions.forEach(suggestion => {
                        showToast(suggestion, 'info', 3000);
                    });
                }
                return;
            }
            
            // Store the analysis
            currentAnalysis = data.results;
            
            // Display the results
            displayAnalysis(data.results);
            
            // Show the result section
            document.getElementById('result-section').style.display = 'block';
            
        } catch (error) {
            showToast('An error occurred while analyzing the verb form', 'error');
        } finally {
            // Hide loader
            submitBtn.disabled = false;
            loader.style.display = 'none';
            submitBtn.querySelector('span').style.opacity = '1';
        }
    });
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tableContainers = document.querySelectorAll('.table-container');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and containers
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tableContainers.forEach(container => container.classList.remove('active'));
            
            // Add active class to clicked button and corresponding container
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`table-${tabId}`).classList.add('active');
        });
    });
}

function displayAnalysis(results) {
    if (!results || !Array.isArray(results) || results.length === 0) {
        document.getElementById('main-analysis').innerHTML = '<div class="analysis-item">No valid analysis found.</div>';
        document.getElementById('detailed-analysis').innerHTML = '';
        return;
    }
    // Main analysis display for best match
    const bestMatch = results[0];
    const mainAnalysisHtml = `
        <div class="analysis-item">
            <strong>Form:</strong> ${bestMatch.original_form}
            ${bestMatch.hk_form ? `<br><strong>Harvard-Kyoto:</strong> ${bestMatch.hk_form}` : ''}
        </div>
        <div class="analysis-item">
            <strong>Best Match Analysis:</strong>
            <br><strong>Tense:</strong> ${bestMatch.analysis.tense}
            <br><strong>Person:</strong> ${bestMatch.analysis.person}
            <br><strong>Number:</strong> ${bestMatch.analysis.number}
            <br><strong>Confidence:</strong> <span class="confidence-${getConfidenceClass(bestMatch.confidence)}">${(bestMatch.confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="analysis-item">
            <strong>Alternative Interpretations:</strong> ${results.length - 1} other possibilities found
        </div>
    `;
    document.getElementById('main-analysis').innerHTML = mainAnalysisHtml;

    // Detailed analysis display with all possibilities
    let detailedAnalysisHtml = `
        <div class="analysis-item">
            <strong>All Possible Analyses</strong>
            ${results.map((possibility, index) => `
                <div class="possibility-item ${index === 0 ? 'best-match' : ''}">
                    <h4>Possibility ${index + 1} ${index === 0 ? '(Best Match)' : ''}</h4>
                    <p>Tense: ${possibility.analysis.tense}</p>
                    <p>Person: ${possibility.analysis.person}</p>
                    <p>Number: ${possibility.analysis.number}</p>
                    <p>Root: ${possibility.potential_root}</p>
                    <p>Ending: ${possibility.ending}</p>
                    <p>Confidence: <span class="confidence-${getConfidenceClass(possibility.confidence)}">${(possibility.confidence * 100).toFixed(1)}%</span></p>
                    ${possibility.analysis.note ? `<p class='note'>${possibility.analysis.note}</p>` : ''}
                    ${possibility.sandhi_applied ? '<p class="note">Sandhi rules applied</p>' : ''}
                    ${possibility.prefix ? `<p>Prefix: ${possibility.prefix} (Sanskrit: ${possibility.sanskrit_prefix})</p>` : ''}
                    ${possibility.notes && possibility.notes.length > 0 ? `<ul>${possibility.notes.map(note => `<li>${note}</li>`).join('')}</ul>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('detailed-analysis').innerHTML = detailedAnalysisHtml;
}

function getConfidenceClass(confidence) {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
}

function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

function copyToClipboard() {
    if (!currentAnalysis) return;
    
    if (!currentAnalysis || !Array.isArray(currentAnalysis) || currentAnalysis.length === 0) return;
    const bestMatch = currentAnalysis[0];
    const textToCopy = `Prakrit Verb Analysis:
Form: ${bestMatch.original_form}
${bestMatch.hk_form ? `Harvard-Kyoto: ${bestMatch.hk_form}` : ''}
Tense: ${bestMatch.analysis.tense}
Person: ${bestMatch.analysis.person}
Number: ${bestMatch.analysis.number}
Root: ${bestMatch.potential_root}
Ending: ${bestMatch.ending}
Confidence: ${bestMatch.reliability}`;

    navigator.clipboard.writeText(textToCopy)
        .then(() => showToast('Analysis copied to clipboard'))
        .catch(() => showToast('Failed to copy to clipboard', 'error'));
}

function exportJSON() {
    if (!currentAnalysis) return;
    
    if (!currentAnalysis || !Array.isArray(currentAnalysis) || currentAnalysis.length === 0) return;
    const dataStr = JSON.stringify(currentAnalysis, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportName = `${currentAnalysis[0].original_form}_analysis.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
    
    showToast('Analysis exported as JSON');
}
