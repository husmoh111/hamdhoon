// State Management
let logEntries = [];
let editId = null;
let staffDirectory = [];
let supervisorDirectory = [];
let statusDirectory = [];

// DOM Elements
const logForm = document.getElementById('log-form');
const entryIdInput = document.getElementById('entry-id');
const logDateInput = document.getElementById('log-date');
const logDayInput = document.getElementById('log-day');
const propertyNameInput = document.getElementById('property-name');
const dutyTypeInput = document.getElementById('duty-type');
const startTimeInput = document.getElementById('start-time');
const breakTimeInput = document.getElementById('break-time');
const endTimeInput = document.getElementById('end-time');
const workDetailInput = document.getElementById('work-detail');
const statusSelect = document.getElementById('status');
const assignedStaffInput = document.getElementById('assigned-staff');
const assignedSupervisorInput = document.getElementById('assigned-supervisor');

const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');
const btnExport = document.getElementById('btn-export');
const btnClearAll = document.getElementById('btn-clear-all');
const logsBody = document.getElementById('logs-body');
const entryCountBadge = document.getElementById('entry-count');
const themeToggle = document.getElementById('theme-toggle');

// Admin Panel DOM Elements
const adminModal = document.getElementById('admin-modal');
const btnAdminOpen = document.getElementById('btn-admin-open');
const btnAdminClose = document.getElementById('btn-admin-close');
const adminAddStaffForm = document.getElementById('admin-add-staff-form');
const newStaffNameInput = document.getElementById('new-staff-name');
const btnImportPreset = document.getElementById('btn-import-preset');
const bulkStaffInput = document.getElementById('bulk-staff-input');
const btnBulkImportSubmit = document.getElementById('btn-bulk-import-submit');
const adminStaffList = document.getElementById('admin-staff-list');
const staffCountBadge = document.getElementById('staff-count');

// Admin Panel Supervisor DOM Elements
const adminAddSupervisorForm = document.getElementById('admin-add-supervisor-form');
const newSupervisorNameInput = document.getElementById('new-supervisor-name');
const bulkSupervisorInput = document.getElementById('bulk-supervisor-input');
const btnBulkSupervisorSubmit = document.getElementById('btn-bulk-supervisor-submit');
const adminSupervisorList = document.getElementById('admin-supervisor-list');
const supervisorCountBadge = document.getElementById('supervisor-count');

// Admin Panel Status DOM Elements
const adminAddStatusForm = document.getElementById('admin-add-status-form');
const newStatusNameInput = document.getElementById('new-status-name');
const btnImportDefaultStatus = document.getElementById('btn-import-default-status');
const bulkStatusInput = document.getElementById('bulk-status-input');
const btnBulkStatusSubmit = document.getElementById('btn-bulk-status-submit');
const adminStatusList = document.getElementById('admin-status-list');
const statusCountBadge = document.getElementById('status-count');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Load Entries from Local Storage
    loadEntries();
    
    // Load Staff Directory
    loadStaffDirectory();

    // Load Supervisor Directory
    loadSupervisorDirectory();

    // Load Status Directory
    loadStatusDirectory();

    // Theme Initializer
    initTheme();

    // Event Listeners
    logDateInput.addEventListener('change', handleDateChange);
    logForm.addEventListener('submit', handleFormSubmit);
    btnCancel.addEventListener('click', resetForm);
    btnExport.addEventListener('click', exportToExcel);
    btnClearAll.addEventListener('click', clearAllEntries);
    themeToggle.addEventListener('click', toggleTheme);

    // Admin Modal Event Listeners
    btnAdminOpen.addEventListener('click', () => toggleAdminModal(true));
    btnAdminClose.addEventListener('click', () => toggleAdminModal(false));
    adminAddStaffForm.addEventListener('submit', handleAddStaffSubmit);
    btnImportPreset.addEventListener('click', importPresetStaff);
    btnBulkImportSubmit.addEventListener('click', handleBulkImportSubmit);

    // Admin Supervisor Modal Event Listeners
    adminAddSupervisorForm.addEventListener('submit', handleAddSupervisorSubmit);
    btnBulkSupervisorSubmit.addEventListener('click', handleBulkSupervisorSubmit);

    // Admin Status Modal Event Listeners
    adminAddStatusForm.addEventListener('submit', handleAddStatusSubmit);
    btnImportDefaultStatus.addEventListener('click', importDefaultStatuses);
    btnBulkStatusSubmit.addEventListener('click', handleBulkStatusSubmit);

    // Modal Tab Click Listeners
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // Show current tab content
            const targetTab = button.getAttribute('data-tab');
            document.getElementById(targetTab).classList.remove('hidden');
        });
    });

    // Close Modal on clicking outside card
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) toggleAdminModal(false);
    });

    // Set Default Date to Today
    const today = new Date().toISOString().split('T')[0];
    logDateInput.value = today;
    handleDateChange();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Calculate Day of Week from Date
function handleDateChange() {
    const dateVal = logDateInput.value;
    if (!dateVal) {
        logDayInput.value = '';
        return;
    }
    
    // Parse YYYY-MM-DD locally to avoid timezone shifts
    const parts = dateVal.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    logDayInput.value = dayOfWeek;
}

// Load and Display Log Entries
function loadEntries() {
    const stored = localStorage.getItem('dailyLogs');
    if (stored) {
        try {
            logEntries = JSON.parse(stored);
        } catch (e) {
            logEntries = [];
        }
    }
    renderTable();
}

function saveEntries() {
    localStorage.setItem('dailyLogs', JSON.stringify(logEntries));
    renderTable();
}

// Render dynamic rows in Table
function renderTable() {
    logsBody.innerHTML = '';
    entryCountBadge.textContent = `${logEntries.length} ${logEntries.length === 1 ? 'entry' : 'entries'}`;

    if (logEntries.length === 0) {
        logsBody.innerHTML = `
            <tr class="empty-row-placeholder">
                <td colspan="12" class="text-center">No entries recorded yet. Fill out the form above to add an entry.</td>
            </tr>
        `;
        return;
    }

    // Sort entries by date descending, then start time
    const sortedEntries = [...logEntries].sort((a, b) => {
        return new Date(b.date + 'T' + b.startTime) - new Date(a.date + 'T' + a.startTime);
    });

    sortedEntries.forEach((entry) => {
        const tr = document.createElement('tr');
        tr.className = 'new-row';
        
        // Format Date to DD-MMM-YYYY (e.g. 22-Jun-2026) for table display
        const dateParts = entry.date.split('-');
        const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        const formattedDate = dateObj.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-');

        const statusClass = entry.status ? entry.status.toLowerCase().replace(/ /g, '-') : '';

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td>${entry.day}</td>
            <td>${escapeHTML(entry.propertyName)}</td>
            <td>${escapeHTML(entry.dutyType)}</td>
            <td>${entry.startTime}</td>
            <td>${escapeHTML(entry.breakTime)}</td>
            <td>${entry.endTime}</td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(entry.workDetail)}">${escapeHTML(entry.workDetail)}</td>
            <td><span class="status-pill ${statusClass}">${entry.status}</span></td>
            <td>${escapeHTML(entry.assignedStaff)}</td>
            <td>${escapeHTML(entry.assignedSupervisor)}</td>
            <td class="actions-col">
                <button class="btn-action-icon edit" onclick="editEntry('${entry.id}')" title="Edit Entry">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
                <button class="btn-action-icon delete" onclick="deleteEntry('${entry.id}')" title="Delete Entry">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </td>
        `;
        logsBody.appendChild(tr);
    });
}

// Handle Form Submission (Add/Edit)
function handleFormSubmit(e) {
    e.preventDefault();

    // Custom Validation
    if (!logForm.checkValidity()) {
        logForm.reportValidity();
        return;
    }

    const entryData = {
        id: editId || 'id_' + Date.now(),
        date: logDateInput.value,
        day: logDayInput.value,
        propertyName: propertyNameInput.value.trim(),
        dutyType: dutyTypeInput.value.trim(),
        startTime: startTimeInput.value,
        breakTime: breakTimeInput.value.trim() || '-',
        endTime: endTimeInput.value,
        workDetail: workDetailInput.value.trim(),
        status: statusSelect.value,
        assignedStaff: assignedStaffInput.value.trim(),
        assignedSupervisor: assignedSupervisorInput.value.trim()
    };

    if (editId) {
        // Edit Mode
        const index = logEntries.findIndex(item => item.id === editId);
        if (index !== -1) {
            logEntries[index] = entryData;
        }
    } else {
        // Add Mode
        logEntries.push(entryData);
    }

    saveEntries();
    resetForm();
}

// Edit Mode Initiator
window.editEntry = function(id) {
    const entry = logEntries.find(item => item.id === id);
    if (!entry) return;

    editId = id;
    entryIdInput.value = entry.id;
    logDateInput.value = entry.date;
    logDayInput.value = entry.day;
    propertyNameInput.value = entry.propertyName;
    dutyTypeInput.value = entry.dutyType;
    startTimeInput.value = entry.startTime;
    breakTimeInput.value = entry.breakTime;
    endTimeInput.value = entry.endTime;
    workDetailInput.value = entry.workDetail;
    statusSelect.value = entry.status;
    assignedStaffInput.value = entry.assignedStaff;
    assignedSupervisorInput.value = entry.assignedSupervisor;

    // UI modifications for edit mode
    btnSubmit.querySelector('span').textContent = 'Update Entry';
    btnSubmit.querySelector('svg').innerHTML = '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>'; // check icon
    btnCancel.classList.remove('hidden');

    // Scroll smoothly to Form card
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
};

// Reset Form State
function resetForm() {
    editId = null;
    entryIdInput.value = '';
    logForm.reset();
    
    // Restore buttons
    btnSubmit.querySelector('span').textContent = 'Add Entry';
    btnSubmit.querySelector('svg').innerHTML = '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>'; // add icon
    btnCancel.classList.add('hidden');

    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    logDateInput.value = today;
    handleDateChange();
}

// Delete Log Entry
window.deleteEntry = function(id) {
    if (confirm('Are you sure you want to delete this log entry?')) {
        logEntries = logEntries.filter(item => item.id !== id);
        saveEntries();
        if (editId === id) resetForm();
    }
};

// Clear All Entries
function clearAllEntries() {
    if (logEntries.length === 0) return;
    if (confirm('CRITICAL: This will delete ALL logged entries permanently. Proceed?')) {
        logEntries = [];
        saveEntries();
        resetForm();
    }
}

// HTML Escaping Utility
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Export to Excel with High Fidelity Formatting via ExcelJS
async function exportToExcel() {
    if (logEntries.length === 0) {
        alert('Please add at least one entry before exporting.');
        return;
    }

    try {
        // Initialize ExcelJS Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Commercial Logs', {
            views: [{ showGridLines: true }] // Ensure Excel gridlines remain visible
        });

        // Column Configs
        const columns = [
            { header: 'Date', key: 'date', width: 14 },
            { header: 'Day', key: 'day', width: 12 },
            { header: 'Property Name', key: 'propertyName', width: 22 },
            { header: 'Duty Type', key: 'dutyType', width: 16 },
            { header: 'Start Time', key: 'startTime', width: 12 },
            { header: 'Break Time', key: 'breakTime', width: 12 },
            { header: 'End Time', key: 'endTime', width: 12 },
            { header: 'Work Detail', key: 'workDetail', width: 38 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Assigned Staff', key: 'assignedStaff', width: 22 },
            { header: 'Assigned Supervisor', key: 'assignedSupervisor', width: 22 }
        ];

        // 1. Insert Title rows first
        // Row 1: Daily Log
        const titleRow = worksheet.getRow(1);
        titleRow.values = ['Daily Log'];
        worksheet.mergeCells('A1:K1');
        titleRow.height = 30;
        titleRow.font = { name: 'Calibri', size: 18, bold: true };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Row 2: Commercial
        const subtitleRow = worksheet.getRow(2);
        subtitleRow.values = ['Commercial'];
        worksheet.mergeCells('A2:K2');
        subtitleRow.height = 20;
        subtitleRow.font = { name: 'Calibri', size: 12, bold: true };
        subtitleRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Row 3: Blank spacing row
        worksheet.getRow(3).height = 15;

        // 4. Set headers starting on Row 4
        const headerRowNumber = 4;
        const headerRow = worksheet.getRow(headerRowNumber);
        
        // Define spreadsheet columns
        worksheet.columns = columns.map(col => ({
            key: col.key,
            width: col.width
        }));

        // Put header values onto row 4
        headerRow.values = columns.map(col => col.header);
        headerRow.height = 24;

        // Apply style to Header row (Row 4) to match the Screenshot: Green fill, bold text, centered
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '000000' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'A9D08E' } // Light Green from screen
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: '70AD47' } },
                bottom: { style: 'medium', color: { argb: '70AD47' } },
                left: { style: 'thin', color: { argb: '70AD47' } },
                right: { style: 'thin', color: { argb: '70AD47' } }
            };
        });

        // Sort entries: earliest date first for exporting sequence
        const exportSortedEntries = [...logEntries].sort((a, b) => {
            return new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime);
        });

        // 5. Add data rows
        exportSortedEntries.forEach((entry) => {
            // Format date format for Excel cell (e.g. 22-Jun-2026)
            const parts = entry.date.split('-');
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            const excelFormattedDate = dateObj.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '-');

            const rowData = {
                date: excelFormattedDate,
                day: entry.day,
                propertyName: entry.propertyName,
                dutyType: entry.dutyType,
                startTime: entry.startTime,
                breakTime: entry.breakTime,
                endTime: entry.endTime,
                workDetail: entry.workDetail,
                status: entry.status,
                assignedStaff: entry.assignedStaff,
                assignedSupervisor: entry.assignedSupervisor
            };

            const newRow = worksheet.addRow(rowData);
            newRow.height = 20;

            // Apply styling: Alignment, Calibri font, and Grid Borders to data cells
            newRow.eachCell((cell, colNumber) => {
                cell.font = { name: 'Calibri', size: 11 };
                
                // Alignment: Center everything except Property, Work Detail, Staff and Supervisor (which look better left/natural or as entered)
                const centerCols = [1, 2, 4, 5, 6, 7, 9];
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: centerCols.includes(colNumber) ? 'center' : 'left',
                    wrapText: colNumber === 8 // Wrap text for Work Detail
                };

                cell.border = {
                    top: { style: 'thin', color: { argb: 'D3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'D3D3D3' } },
                    left: { style: 'thin', color: { argb: 'D3D3D3' } },
                    right: { style: 'thin', color: { argb: 'D3D3D3' } }
                };
            });
        });

        // Generate and download XLSX File
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Daily_Log_Commercial.xlsx';
        document.body.appendChild(anchor);
        anchor.click();
        
        // Clean up
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error generating Excel file:', error);
        alert('An error occurred while generating the Excel file. Please try again.');
    }
}

// Preset Staff List from Screenshot
const PRESET_STAFF = [
    "Ahmed Saleem", "Moosa Jameel", "Abdulla Hussain", "Hussain Niyaz",
    "Ismail Yahya", "Mohamed Ismail", "Mohamed Rameez", "Ripon Mia",
    "Monir Hosen", "Suhel", "Mirza Sirajul Islam", "Rajib Hoshen",
    "Mohammad Nur Uddin", "Md Kamrul Islam", "Mohammad Jibon Mia",
    "Mohammad Golab Mia", "Mohammad Al Amin", "Aslam Haaroon",
    "Mariyam Liusha", "Asma Hussain", "Fathimath Ishaq", "Rahma Ibrahim",
    "Aminath Rifa", "Aishath Aneesa", "Mariyath Ibrahim"
];

// Admin Modal toggler
function toggleAdminModal(show) {
    if (show) {
        adminModal.classList.remove('hidden');
        renderAdminStaffList();
        renderAdminSupervisorList();
        renderAdminStatusList();
    } else {
        adminModal.classList.add('hidden');
    }
}

// Load and Save Staff Directory
function loadStaffDirectory() {
    const stored = localStorage.getItem('staffDirectory');
    if (stored) {
        try {
            staffDirectory = JSON.parse(stored);
        } catch (e) {
            staffDirectory = [];
        }
    } else {
        staffDirectory = [];
    }
    updateStaffSelect();
}

function saveStaffDirectory() {
    localStorage.setItem('staffDirectory', JSON.stringify(staffDirectory));
    updateStaffSelect();
    renderAdminStaffList();
}

// Add staff via inline form
function handleAddStaffSubmit(e) {
    e.preventDefault();
    const name = newStaffNameInput.value.trim();
    if (!name) return;
    
    if (staffDirectory.some(existingName => existingName.toLowerCase() === name.toLowerCase())) {
        alert('This staff member already exists in the directory.');
        return;
    }
    
    staffDirectory.push(name);
    saveStaffDirectory();
    newStaffNameInput.value = '';
}

// Import exact preset staff
function importPresetStaff() {
    let countAdded = 0;
    PRESET_STAFF.forEach(name => {
        const trimmed = name.trim();
        if (trimmed && !staffDirectory.some(existingName => existingName.toLowerCase() === trimmed.toLowerCase())) {
            staffDirectory.push(trimmed);
            countAdded++;
        }
    });
    
    if (countAdded > 0) {
        saveStaffDirectory();
        alert(`Successfully imported ${countAdded} staff members.`);
    } else {
        alert('All preset staff members are already in the directory.');
    }
}

// Bulk Import paste textarea
function handleBulkImportSubmit() {
    const text = bulkStaffInput.value;
    if (!text.trim()) {
        alert('Please enter or paste at least one name.');
        return;
    }
    
    const names = text.split('\n');
    let countAdded = 0;
    
    names.forEach(name => {
        const trimmed = name.trim();
        if (trimmed && !staffDirectory.some(existingName => existingName.toLowerCase() === trimmed.toLowerCase())) {
            staffDirectory.push(trimmed);
            countAdded++;
        }
    });
    
    if (countAdded > 0) {
        saveStaffDirectory();
        bulkStaffInput.value = '';
        alert(`Successfully imported ${countAdded} staff members.`);
    } else {
        alert('No new staff members were added (duplicates skipped).');
    }
}

// Delete staff row
window.deleteStaff = function(originalIndex) {
    const nameToDelete = staffDirectory[originalIndex];
    if (confirm(`Remove "${nameToDelete}" from the staff directory?`)) {
        staffDirectory.splice(originalIndex, 1);
        saveStaffDirectory();
    }
};

// Render directory list inside modal
function renderAdminStaffList() {
    adminStaffList.innerHTML = '';
    staffCountBadge.textContent = `${staffDirectory.length} ${staffDirectory.length === 1 ? 'member' : 'members'}`;

    if (staffDirectory.length === 0) {
        adminStaffList.innerHTML = `
            <li style="color: var(--text-muted); justify-content: center; padding: 1.5rem; text-align: center;">
                Directory is empty. Add or import staff above.
            </li>`;
        return;
    }

    // Map names to their indexes first, then sort alphabetically
    const sorted = staffDirectory
        .map((name, index) => ({ name, index }))
        .sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${escapeHTML(item.name)}</span>
            <button class="btn-action-icon delete" onclick="deleteStaff(${item.index})" title="Delete Staff">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
        adminStaffList.appendChild(li);
    });
}

// Update form select dropdown options
function updateStaffSelect() {
    // Preserve current selection if any
    const currentValue = assignedStaffInput.value;
    
    assignedStaffInput.innerHTML = '<option value="" disabled selected>Select Staff</option>';
    
    if (staffDirectory.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.textContent = 'No staff available. Add in Admin Menu';
        assignedStaffInput.appendChild(option);
        return;
    }
    
    // Sort alphabetically for easy dropdown browsing
    const sorted = [...staffDirectory].sort();
    sorted.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        assignedStaffInput.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (staffDirectory.includes(currentValue)) {
        assignedStaffInput.value = currentValue;
    }
}

// Supervisor Directory Storage Methods
function loadSupervisorDirectory() {
    const stored = localStorage.getItem('supervisorDirectory');
    if (stored) {
        try {
            supervisorDirectory = JSON.parse(stored);
        } catch (e) {
            supervisorDirectory = [];
        }
    } else {
        supervisorDirectory = [];
    }
    updateSupervisorSelect();
}

function saveSupervisorDirectory() {
    localStorage.setItem('supervisorDirectory', JSON.stringify(supervisorDirectory));
    updateSupervisorSelect();
    renderAdminSupervisorList();
}

// Add supervisor via inline form
function handleAddSupervisorSubmit(e) {
    e.preventDefault();
    const name = newSupervisorNameInput.value.trim();
    if (!name) return;
    
    if (supervisorDirectory.some(existingName => existingName.toLowerCase() === name.toLowerCase())) {
        alert('This supervisor already exists in the directory.');
        return;
    }
    
    supervisorDirectory.push(name);
    saveSupervisorDirectory();
    newSupervisorNameInput.value = '';
}

// Bulk Import supervisors textarea
function handleBulkSupervisorSubmit() {
    const text = bulkSupervisorInput.value;
    if (!text.trim()) {
        alert('Please enter or paste at least one supervisor name.');
        return;
    }
    
    const names = text.split('\n');
    let countAdded = 0;
    
    names.forEach(name => {
        const trimmed = name.trim();
        if (trimmed && !supervisorDirectory.some(existingName => existingName.toLowerCase() === trimmed.toLowerCase())) {
            supervisorDirectory.push(trimmed);
            countAdded++;
        }
    });
    
    if (countAdded > 0) {
        saveSupervisorDirectory();
        bulkSupervisorInput.value = '';
        alert(`Successfully imported ${countAdded} supervisors.`);
    } else {
        alert('No new supervisors were added (duplicates skipped).');
    }
}

// Delete supervisor row
window.deleteSupervisor = function(originalIndex) {
    const nameToDelete = supervisorDirectory[originalIndex];
    if (confirm(`Remove "${nameToDelete}" from the supervisor directory?`)) {
        supervisorDirectory.splice(originalIndex, 1);
        saveSupervisorDirectory();
    }
};

// Render supervisor directory list inside modal
function renderAdminSupervisorList() {
    adminSupervisorList.innerHTML = '';
    supervisorCountBadge.textContent = `${supervisorDirectory.length} ${supervisorDirectory.length === 1 ? 'supervisor' : 'supervisors'}`;

    if (supervisorDirectory.length === 0) {
        adminSupervisorList.innerHTML = `
            <li style="color: var(--text-muted); justify-content: center; padding: 1.5rem; text-align: center;">
                Directory is empty. Add or import supervisors above.
            </li>`;
        return;
    }

    // Map names to their indexes first, then sort alphabetically
    const sorted = supervisorDirectory
        .map((name, index) => ({ name, index }))
        .sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${escapeHTML(item.name)}</span>
            <button class="btn-action-icon delete" onclick="deleteSupervisor(${item.index})" title="Delete Supervisor">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
        adminSupervisorList.appendChild(li);
    });
}

// Update form supervisor select dropdown options
function updateSupervisorSelect() {
    // Preserve current selection if any
    const currentValue = assignedSupervisorInput.value;
    
    assignedSupervisorInput.innerHTML = '<option value="" disabled selected>Select Supervisor</option>';
    
    if (supervisorDirectory.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.textContent = 'No supervisors available. Add in Admin Menu';
        assignedSupervisorInput.appendChild(option);
        return;
    }
    
    // Sort alphabetically for easy dropdown browsing
    const sorted = [...supervisorDirectory].sort();
    sorted.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        assignedSupervisorInput.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (supervisorDirectory.includes(currentValue)) {
        assignedSupervisorInput.value = currentValue;
    }
}

// Status Directory Storage Methods
function loadStatusDirectory() {
    const stored = localStorage.getItem('statusDirectory');
    if (stored) {
        try {
            statusDirectory = JSON.parse(stored);
        } catch (e) {
            statusDirectory = [];
        }
    } else {
        statusDirectory = [];
    }
    
    // Pre-populate defaults if local directory is empty to ensure smooth initial experience
    if (statusDirectory.length === 0) {
        statusDirectory = ["Pending", "In Progress", "Completed"];
        localStorage.setItem('statusDirectory', JSON.stringify(statusDirectory));
    }
    
    updateStatusSelect();
}

function saveStatusDirectory() {
    localStorage.setItem('statusDirectory', JSON.stringify(statusDirectory));
    updateStatusSelect();
    renderAdminStatusList();
    
    // Also re-render logs table in case statuses were removed or added
    renderTable();
}

// Add status via inline form
function handleAddStatusSubmit(e) {
    e.preventDefault();
    const name = newStatusNameInput.value.trim();
    if (!name) return;
    
    if (statusDirectory.some(existingName => existingName.toLowerCase() === name.toLowerCase())) {
        alert('This status already exists in the directory.');
        return;
    }
    
    statusDirectory.push(name);
    saveStatusDirectory();
    newStatusNameInput.value = '';
}

// Import default statuses (Pending, In Progress, Completed)
function importDefaultStatuses() {
    const defaults = ["Pending", "In Progress", "Completed"];
    let countAdded = 0;
    
    defaults.forEach(status => {
        if (!statusDirectory.some(existingName => existingName.toLowerCase() === status.toLowerCase())) {
            statusDirectory.push(status);
            countAdded++;
        }
    });
    
    if (countAdded > 0) {
        saveStatusDirectory();
        alert(`Successfully imported ${countAdded} default statuses.`);
    } else {
        alert('All default statuses are already present.');
    }
}

// Bulk Import statuses textarea
function handleBulkStatusSubmit() {
    const text = bulkStatusInput.value;
    if (!text.trim()) {
        alert('Please enter or paste at least one status.');
        return;
    }
    
    const names = text.split('\n');
    let countAdded = 0;
    
    names.forEach(name => {
        const trimmed = name.trim();
        if (trimmed && !statusDirectory.some(existingName => existingName.toLowerCase() === trimmed.toLowerCase())) {
            statusDirectory.push(trimmed);
            countAdded++;
        }
    });
    
    if (countAdded > 0) {
        saveStatusDirectory();
        bulkStatusInput.value = '';
        alert(`Successfully imported ${countAdded} statuses.`);
    } else {
        alert('No new statuses were added (duplicates skipped).');
    }
}

// Delete status
window.deleteStatus = function(originalIndex) {
    const nameToDelete = statusDirectory[originalIndex];
    if (confirm(`Remove "${nameToDelete}" from the status list? Existing entries with this status will remain.`)) {
        statusDirectory.splice(originalIndex, 1);
        saveStatusDirectory();
    }
};

// Render status directory list inside modal
function renderAdminStatusList() {
    adminStatusList.innerHTML = '';
    statusCountBadge.textContent = `${statusDirectory.length} ${statusDirectory.length === 1 ? 'status' : 'statuses'}`;

    if (statusDirectory.length === 0) {
        adminStatusList.innerHTML = `
            <li style="color: var(--text-muted); justify-content: center; padding: 1.5rem; text-align: center;">
                List is empty. Add or import statuses above.
            </li>`;
        return;
    }

    // Map names to their indexes first, then sort alphabetically
    const sorted = statusDirectory
        .map((name, index) => ({ name, index }))
        .sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${escapeHTML(item.name)}</span>
            <button class="btn-action-icon delete" onclick="deleteStatus(${item.index})" title="Delete Status">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
        adminStatusList.appendChild(li);
    });
}

// Update form status select dropdown options
function updateStatusSelect() {
    // Preserve current selection if any
    const currentValue = statusSelect.value;
    
    statusSelect.innerHTML = '<option value="" disabled selected>Select Status</option>';
    
    if (statusDirectory.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.textContent = 'No status options available. Add in Admin Menu';
        statusSelect.appendChild(option);
        return;
    }
    
    // Sort alphabetically for easy dropdown browsing
    const sorted = [...statusDirectory].sort();
    sorted.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        statusSelect.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (statusDirectory.includes(currentValue)) {
        statusSelect.value = currentValue;
    }
}
