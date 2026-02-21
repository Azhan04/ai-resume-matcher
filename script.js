// Theme toggle functionality
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';

if (currentTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
}

themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';

    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Update filename on select
document.getElementById("resume").addEventListener("change", function () {
    const file = this.files[0];
    document.getElementById("filename").textContent = file ? file.name : "No file selected";
});

// Chart drawing function
function drawComparisonChart(initialScore = 0) {
    const canvas = document.getElementById('comparisonChart');
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
    ctx.lineWidth = 1;

    // Horizontal grid lines (0%, 25%, 50%, 75%, 100%)
    for (let y = 0; y <= 100; y += 25) {
        const yPos = canvas.height - (y / 100) * (canvas.height - 40);
        ctx.beginPath();
        ctx.moveTo(40, yPos);
        ctx.lineTo(canvas.width - 40, yPos);
        ctx.stroke();

        // Label
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
        ctx.font = '10px Arial';
        ctx.fillText(`${y}%`, 5, yPos + 4);
    }

    // Draw bars
    const barWidth = 40;
    const barSpacing = 80;
    const centerX = canvas.width / 2;

    // "Before" bar (initial score)
    const beforeHeight = (initialScore / 100) * (canvas.height - 40);
    const beforeX = centerX - barSpacing;
    ctx.fillStyle = '#e71d36'; // Red for "before"
    ctx.fillRect(beforeX, canvas.height - 40 - beforeHeight, barWidth, beforeHeight);

    // "After" bar (with improvement suggestions)
    const afterScore = Math.min(100, initialScore + 20); // Simulate improvement
    const afterHeight = (afterScore / 100) * (canvas.height - 40);
    const afterX = centerX + barSpacing - barWidth;
    ctx.fillStyle = '#2ec4b6'; // Green for "after"
    ctx.fillRect(afterX, canvas.height - 40 - afterHeight, barWidth, afterHeight);

    // Labels
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Before', beforeX + barWidth / 2, canvas.height - 10);
    ctx.fillText('After', afterX + barWidth / 2, canvas.height - 10);

    // Value labels
    ctx.font = '10px Arial';
    ctx.fillText(`${initialScore}%`, beforeX + barWidth / 2, canvas.height - 40 - beforeHeight - 10);
    ctx.fillText(`${afterScore}%`, afterX + barWidth / 2, canvas.height - 40 - afterHeight - 10);
}

// Function to generate detailed PDF content
function generatePDFContent(data) {
    // Create a temporary div with styled content for PDF
    const pdfContent = document.createElement('div');
    pdfContent.className = 'pdf-report';
    pdfContent.innerHTML = `
    <style>
      .pdf-report {
        font-family: Arial, sans-serif;
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
        background: white;
        color: black;
      }
      .pdf-header {
        text-align: center;
        border-bottom: 2px solid #4361ee;
        padding-bottom: 15px;
        margin-bottom: 20px;
      }
      .pdf-title {
        font-size: 24px;
        color: #4361ee;
        margin: 0;
        font-weight: bold;
      }
      .pdf-subtitle {
        font-size: 14px;
        color: #666;
        margin: 5px 0 0 0;
      }
      .pdf-section {
        margin-bottom: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        background: white;
      }
      .pdf-section h3 {
        color: #4361ee;
        margin: 0 0 10px 0;
        font-size: 18px;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
      }
      .pdf-score {
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        margin: 10px 0;
      }
      .high-score { color: #2ec4b6; }
      .medium-score { color: #ff9f00; }
      .low-score { color: #e71d36; }
      .pdf-skills {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin: 10px 0;
        min-height: 20px;
      }
      .pdf-skill-chip {
        background: #eef2ff;
        color: #4361ee;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        display: inline-block;
        margin: 2px;
      }
      .pdf-suggestion {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid #4361ee;
      }
      .pdf-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin: 15px 0;
      }
      .pdf-stat-item {
        text-align: center;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 6px;
      }
      .pdf-stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #4361ee;
      }
      .pdf-stat-label {
        font-size: 12px;
        color: #666;
      }
      .pdf-additional-info {
        font-size: 12px;
      }
    </style>
    
    <div class="pdf-header">
      <h1 class="pdf-title">AI Resume Match Report</h1>
      <p class="pdf-subtitle">Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="pdf-section">
      <h3>📊 Overall Match Score</h3>
      <div class="pdf-score ${data.match_percentage >= 80 ? 'high-score' : data.match_percentage >= 50 ? 'medium-score' : 'low-score'}">${data.match_percentage.toFixed(1)}%</div>
      <div class="pdf-stats">
        <div class="pdf-stat-item">
          <div class="pdf-stat-value">${data.keyword_overlap_ratio.toFixed(1)}%</div>
          <div class="pdf-stat-label">Keyword Match</div>
        </div>
        <div class="pdf-stat-item">
          <div class="pdf-stat-value">${data.skills_analysis.skills_match_percentage.toFixed(1)}%</div>
          <div class="pdf-stat-label">Skills Match</div>
        </div>
        <div class="pdf-stat-item">
          <div class="pdf-stat-value">${data.skills_analysis.skills_match_count}</div>
          <div class="pdf-stat-label">Matching Skills</div>
        </div>
      </div>
    </div>
    
    <div class="pdf-section">
      <h3>🛠️ Skills Analysis</h3>
      <p><strong>Your Skills:</strong></p>
      <div class="pdf-skills">
        ${data.skills_analysis.resume_skills_found.length > 0
            ? data.skills_analysis.resume_skills_found.map(skill =>
                `<span class="pdf-skill-chip">${skill}</span>`
            ).join('')
            : '<em>No skills detected</em>'
        }
      </div>
      
      <p><strong>Job Required Skills:</strong></p>
      <div class="pdf-skills">
        ${data.skills_analysis.jd_skills_found.length > 0
            ? data.skills_analysis.jd_skills_found.map(skill =>
                `<span class="pdf-skill-chip">${skill}</span>`
            ).join('')
            : '<em>No skills detected</em>'
        }
      </div>
      
      <p><strong>Matched Skills:</strong></p>
      <div class="pdf-skills">
        ${data.skills_analysis.matched_skills.length > 0
            ? data.skills_analysis.matched_skills.map(skill =>
                `<span class="pdf-skill-chip">${skill}</span>`
            ).join('')
            : '<em>No matching skills</em>'
        }
      </div>
    </div>
    
    <div class="pdf-section">
      <h3>💡 Recommendation</h3>
      <div class="pdf-suggestion">${data.suggestion}</div>
    </div>
    
    <div class="pdf-section">
      <h3>📋 Additional Information</h3>
      <div class="pdf-additional-info">
        <p><strong>Resume Length:</strong> ${data.details.resume_chars} characters, ${data.details.resume_lines} lines</p>
        <p><strong>Experience Years (detected):</strong> ${data.experience_analysis.resume_experience_years}</p>
        <p><strong>Missing Keywords Sample:</strong> ${data.missing_keywords_sample.length > 0 ? data.missing_keywords_sample.join(', ') : 'None'}</p>
      </div>
    </div>
  `;

    return pdfContent;
}

// Form submission
document.getElementById("uploadForm").onsubmit = async function (e) {
    e.preventDefault();

    const file = document.getElementById("resume").files[0];
    const jobDesc = document.getElementById("jobdesc").value.trim();

    if (!file) {
        alert("⚠️ Please select a resume file (PDF or DOCX).");
        return;
    }
    if (!jobDesc) {
        alert("⚠️ Please paste a job description.");
        return;
    }

    const status = document.getElementById("status");
    const result = document.getElementById("result");
    const copyBtn = document.getElementById("copyBtn");
    const exportBtn = document.getElementById("exportPdfBtn");

    status.style.display = "block";
    result.style.display = "none";
    copyBtn.style.display = "none";
    exportBtn.style.display = "none";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jobDesc);

    try {
        const response = await fetch("https://ai-resume-matcher-0aki.onrender.com", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();

        status.style.display = "none";
        result.style.display = "block";

        // Update score gauge
        const score = data.match_percentage || 0;
        const scoreFill = document.getElementById("scoreFill");
        const scoreText = document.getElementById("scoreText");
        scoreFill.style.width = `${Math.min(score, 100)}%`;
        scoreText.textContent = `${score.toFixed(1)}%`;

        // Color code gauge
        if (score >= 80) scoreFill.style.backgroundColor = "#2ec4b6"; // success
        else if (score >= 50) scoreFill.style.backgroundColor = "#ff9f00"; // warning
        else scoreFill.style.backgroundColor = "#e71d36"; // danger

        // Draw comparison chart
        drawComparisonChart(score);

        // Skills
        const yourSkillsEl = document.getElementById("yourSkills");
        const jobSkillsEl = document.getElementById("jobSkills");
        const matchedSkillsEl = document.getElementById("matchedSkills");

        yourSkillsEl.innerHTML = data.skills_analysis?.resume_skills_found?.length
            ? data.skills_analysis.resume_skills_found.map(s => `<span class="skill-chip">${s}</span>`).join("")
            : "<em>None detected</em>";

        jobSkillsEl.innerHTML = data.skills_analysis?.jd_skills_found?.length
            ? data.skills_analysis.jd_skills_found.map(s => `<span class="skill-chip">${s}</span>`).join("")
            : "<em>None detected</em>";

        matchedSkillsEl.innerHTML = data.skills_analysis?.matched_skills?.length
            ? data.skills_analysis.matched_skills.map(s => `<span class="skill-chip">${s}</span>`).join("")
            : "<em>None</em>";

        // Suggestion
        document.getElementById("suggestionText").textContent = data.suggestion || "No suggestion available.";

        // Show buttons
        copyBtn.style.display = "flex";
        exportBtn.style.display = "flex";

        // Copy button
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(data.suggestion).then(() => {
                copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2zm0 1h10v12H5V3z"/><path d="M3 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z"/></svg> ✓ Copied!`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2zm0 1h10v12H5V3z"/><path d="M3 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z"/></svg> Copy Suggestion`;
                }, 2000);
            });
        };

        // Export PDF button (updated to include detailed report)
        exportBtn.onclick = () => {
            const pdfContent = generatePDFContent(data);

            // Hide the original result temporarily
            const originalResult = document.getElementById("result");
            const wasVisible = originalResult.style.display !== 'none';
            if (wasVisible) {
                originalResult.style.display = 'none';
            }

            // Add the PDF content to the document temporarily
            document.body.appendChild(pdfContent);

            const opt = {
                margin: 10,
                filename: `resume-match-report-${new Date().toISOString().slice(0, 10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, allowTaint: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(pdfContent).save().then(() => {
                // Clean up: remove the temporary PDF content and restore visibility
                document.body.removeChild(pdfContent);
                if (wasVisible) {
                    originalResult.style.display = 'block';
                }
            }).catch(err => {
                console.error("PDF generation error:", err);
                // Still clean up even if there's an error
                if (pdfContent.parentNode) {
                    document.body.removeChild(pdfContent);
                }
                if (wasVisible) {
                    originalResult.style.display = 'block';
                }
            });
        };

    } catch (err) {
        status.style.display = "none";
        result.style.display = "block";
        document.getElementById("suggestionText").innerHTML = `<span style="color:red;">❌ Error: ${err.message}</span>`;
        console.error("Analysis failed:", err);
    }
};
