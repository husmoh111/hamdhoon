// State Management
let logEntries = [];
let editId = null;
let staffDirectory = [];
let supervisorDirectory = [];
let statusDirectory = [];
let propertyDirectory = [];
let selectedStaff = [];
let selectedSupervisors = [];
let currentUser = null;
let userDirectory = [];

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

// Custom Multiselect Selectors
const staffMultiselect = document.getElementById('staff-multiselect');
const staffSelectBox = staffMultiselect.querySelector('.multiselect-select-box');
const staffPlaceholder = document.getElementById('staff-placeholder');
const staffTagsContainer = document.getElementById('staff-tags');
const staffOptionsDropdown = document.getElementById('staff-options-dropdown');
const staffSearchInput = document.getElementById('staff-search-input');
const staffOptionsList = document.getElementById('staff-options-list');

const supervisorMultiselect = document.getElementById('supervisor-multiselect');
const supervisorSelectBox = supervisorMultiselect.querySelector('.multiselect-select-box');
const supervisorPlaceholder = document.getElementById('supervisor-placeholder');
const supervisorTagsContainer = document.getElementById('supervisor-tags');
const supervisorOptionsDropdown = document.getElementById('supervisor-options-dropdown');
const supervisorSearchInput = document.getElementById('supervisor-search-input');
const supervisorOptionsList = document.getElementById('supervisor-options-list');

// Dashboard View Elements
const logsViewSection = document.getElementById('logs-view-section');
const dashboardViewSection = document.getElementById('dashboard-view-section');
const viewSwitcher = document.getElementById('view-switcher');
const switcherButtons = viewSwitcher.querySelectorAll('.switcher-btn');

// KPI Elements
const kpiTotalLogs = document.getElementById('kpi-total-logs');
const kpiTotalHours = document.getElementById('kpi-total-hours');
const kpiTotalProperties = document.getElementById('kpi-total-properties');
const kpiPendingLogs = document.getElementById('kpi-pending-logs');

// Charts variables
let chartStatus = null;
let chartProperty = null;
let chartTimeline = null;

// Login and Session DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const loginFormElement = document.getElementById('login-form-element');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const userBadge = document.getElementById('user-badge');
const userNameDisplay = document.getElementById('user-name-display');
const userRoleDisplay = document.getElementById('user-role-display');
const btnLogout = document.getElementById('btn-logout');

// Admin Panel Users DOM Elements
const adminAddUserForm = document.getElementById('admin-add-user-form');
const newUserNameInput = document.getElementById('new-user-name');
const newUserUsernameInput = document.getElementById('new-user-username');
const newUserPasswordInput = document.getElementById('new-user-password');
const newUserRoleSelect = document.getElementById('new-user-role');
const adminUserList = document.getElementById('admin-user-list');
const userCountBadge = document.getElementById('user-count');

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

// Admin Panel Property DOM Elements
const adminAddPropertyForm = document.getElementById('admin-add-property-form');
const newPropertyNameInput = document.getElementById('new-property-name');
const btnImportPresetProperties = document.getElementById('btn-import-preset-properties');
const bulkPropertyInput = document.getElementById('bulk-property-input');
const btnBulkPropertySubmit = document.getElementById('btn-bulk-property-submit');
const adminPropertyList = document.getElementById('admin-property-list');
const propertyCountBadge = document.getElementById('property-count');

// Sync Queue and Database State
let syncQueue = [];
let isSyncing = false;

const dbSyncStatus = document.getElementById('db-sync-status');
const dbSyncText = document.getElementById('db-sync-text');

// Helper to safely parse JSON responses and show descriptive errors
async function parseJSONResponse(response) {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned a non-JSON response (HTML or plain text). Please verify that PHP is installed and configured on your web server.');
    }
    return await response.json();
}

function loadSyncQueue() {
    const stored = localStorage.getItem('syncQueue');
    if (stored) {
        try {
            syncQueue = JSON.parse(stored);
        } catch (e) {
            syncQueue = [];
        }
    } else {
        syncQueue = [];
    }
}

function saveSyncQueue() {
    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
}

function addToSyncQueue(operation) {
    if (operation.type === 'save_log') {
        syncQueue = syncQueue.filter(op => !(op.type === 'save_log' && op.data.id === operation.data.id));
    } else if (operation.type === 'delete_log') {
        syncQueue = syncQueue.filter(op => !(op.type === 'save_log' && op.data.id === operation.data));
        syncQueue = syncQueue.filter(op => !(op.type === 'delete_log' && op.data === operation.data));
    } else if (operation.type.startsWith('save_') && operation.type.endsWith('_dir')) {
        syncQueue = syncQueue.filter(op => op.type !== operation.type);
    }
    
    syncQueue.push(operation);
    saveSyncQueue();
    updateSyncUI();
    
    syncOfflineData();
}

function updateSyncUI() {
    if (!dbSyncStatus) return;
    
    if (syncQueue.length > 0) {
        dbSyncStatus.classList.remove('hidden');
        dbSyncStatus.className = 'db-sync-status syncing';
        dbSyncText.textContent = `Pending Sync (${syncQueue.length})`;
    } else {
        dbSyncStatus.classList.remove('hidden');
        dbSyncStatus.className = 'db-sync-status synced';
        dbSyncText.textContent = 'Synced';
        setTimeout(() => {
            if (syncQueue.length === 0) {
                dbSyncStatus.classList.add('hidden');
            }
        }, 3000);
    }
}

async function syncOfflineData() {
    if (isSyncing || syncQueue.length === 0) return;
    if (!navigator.onLine) {
        updateSyncUI();
        return;
    }
    
    isSyncing = true;
    updateSyncUI();
    
    try {
        while (syncQueue.length > 0) {
            const op = syncQueue[0];
            let success = false;
            
            const actionMap = {
                'save_log': 'save_log',
                'delete_log': 'delete_log',
                'clear_all_logs': 'clear_all_logs',
                'save_staff_dir': 'save_staff_dir',
                'save_supervisor_dir': 'save_supervisor_dir',
                'save_status_dir': 'save_status_dir',
                'save_property_dir': 'save_property_dir',
                'save_user_dir': 'save_user_dir'
            };
            
            const action = actionMap[op.type];
            if (!action) {
                syncQueue.shift();
                saveSyncQueue();
                continue;
            }
            
            let bodyData = {};
            if (op.type === 'save_log') {
                bodyData = { log: op.data };
            } else if (op.type === 'delete_log') {
                bodyData = { id: op.data };
            } else if (op.type === 'save_staff_dir') {
                bodyData = { staff: op.data };
            } else if (op.type === 'save_supervisor_dir') {
                bodyData = { supervisors: op.data };
            } else if (op.type === 'save_status_dir') {
                bodyData = { statuses: op.data };
            } else if (op.type === 'save_property_dir') {
                bodyData = { properties: op.data };
            } else if (op.type === 'save_user_dir') {
                bodyData = { users: op.data };
            }
            
            const response = await fetch(`api.php?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            const resData = await parseJSONResponse(response);
            success = resData.success;
            
            if (success) {
                syncQueue.shift();
                saveSyncQueue();
                updateSyncUI();
            } else {
                console.error('Failed to sync operation:', op, resData.message);
                dbSyncStatus.className = 'db-sync-status error';
                dbSyncText.textContent = 'Sync Error';
                break;
            }
        }
    } catch (error) {
        console.error('Connection error during sync:', error);
        dbSyncStatus.className = 'db-sync-status error';
        dbSyncText.textContent = 'Sync Paused';
    } finally {
        isSyncing = false;
        updateSyncUI();
    }
}

async function initDatabaseState() {
    loadSyncQueue();
    updateSyncUI();
    
    window.addEventListener('online', () => {
        syncOfflineData();
    });
    
    try {
        const response = await fetch('api.php?action=init_app');
        const data = await parseJSONResponse(response);
        
        if (data.success) {
            logEntries = data.logs || [];
            staffDirectory = data.staff || [];
            supervisorDirectory = data.supervisors || [];
            statusDirectory = data.statuses || [];
            propertyDirectory = data.properties || [];
            userDirectory = data.users || [];
            
            localStorage.setItem('dailyLogs', JSON.stringify(logEntries));
            localStorage.setItem('staffDirectory', JSON.stringify(staffDirectory));
            localStorage.setItem('supervisorDirectory', JSON.stringify(supervisorDirectory));
            localStorage.setItem('statusDirectory', JSON.stringify(statusDirectory));
            localStorage.setItem('propertyDirectory', JSON.stringify(propertyDirectory));
            localStorage.setItem('userDirectory', JSON.stringify(userDirectory));
            
            console.log('Database state loaded and cached successfully.');
        } else {
            console.warn('API returned error, loading from local cache:', data.message);
            loadAllFromLocalStorage();
        }
    } catch (e) {
        console.error('Failed to connect to database, loading from local cache:', e);
        loadAllFromLocalStorage();
    }
    
    await initAuth();
    
    renderTable();
    updateStaffSelect();
    updateSupervisorSelect();
    updateStatusSelect();
    updatePropertySelect();
    
    if (syncQueue.length > 0) {
        syncOfflineData();
    }
}

function loadAllFromLocalStorage() {
    loadUserDirectory();
    loadEntries();
    loadStaffDirectory();
    loadSupervisorDirectory();
    loadStatusDirectory();
    loadPropertyDirectory();
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered successfully:', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    }

    // Initialize iOS PWA Install Prompt
    initIOSInstallPrompt();

    // Theme Initializer
    initTheme();

    // Load Database state
    initDatabaseState();

    // Event Listeners
    logDateInput.addEventListener('change', handleDateChange);
    logForm.addEventListener('submit', handleFormSubmit);
    btnCancel.addEventListener('click', resetForm);
    btnExport.addEventListener('click', exportToExcel);
    btnClearAll.addEventListener('click', clearAllEntries);
    themeToggle.addEventListener('click', toggleTheme);

    // Login and Logout Event Listeners
    loginFormElement.addEventListener('submit', handleLoginSubmit);
    btnLogout.addEventListener('click', handleLogoutClick);

    // View Switcher Event Listeners
    switcherButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switcherButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetView = btn.getAttribute('data-view');
            if (targetView === 'dashboard') {
                logsViewSection.classList.add('hidden');
                dashboardViewSection.classList.remove('hidden');
                renderDashboard();
            } else {
                logsViewSection.classList.remove('hidden');
                dashboardViewSection.classList.add('hidden');
            }
        });
    });

    // Admin Modal Event Listeners
    btnAdminOpen.addEventListener('click', () => toggleAdminModal(true));
    btnAdminClose.addEventListener('click', () => toggleAdminModal(false));
    adminAddStaffForm.addEventListener('submit', handleAddStaffSubmit);
    btnImportPreset.addEventListener('click', importPresetStaff);
    btnBulkImportSubmit.addEventListener('click', handleBulkImportSubmit);
    adminAddUserForm.addEventListener('submit', handleAddUserSubmit);

    // Custom Multiselect Event Listeners (Staff & Supervisor)
    staffSelectBox.addEventListener('click', (e) => {
        e.stopPropagation();
        staffMultiselect.classList.toggle('open');
        staffOptionsDropdown.classList.toggle('hidden');
        
        // Close supervisor dropdown if open
        supervisorMultiselect.classList.remove('open');
        supervisorOptionsDropdown.classList.add('hidden');
    });

    supervisorSelectBox.addEventListener('click', (e) => {
        e.stopPropagation();
        supervisorMultiselect.classList.toggle('open');
        supervisorOptionsDropdown.classList.toggle('hidden');
        
        // Close staff dropdown if open
        staffMultiselect.classList.remove('open');
        staffOptionsDropdown.classList.add('hidden');
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (staffMultiselect && !staffMultiselect.contains(e.target)) {
            staffMultiselect.classList.remove('open');
            staffOptionsDropdown.classList.add('hidden');
        }
        if (supervisorMultiselect && !supervisorMultiselect.contains(e.target)) {
            supervisorMultiselect.classList.remove('open');
            supervisorOptionsDropdown.classList.add('hidden');
        }
    });

    // Filter staff list options on search input
    staffSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const labels = staffOptionsList.querySelectorAll('.option-label');
        labels.forEach(label => {
            const name = label.getAttribute('data-name').toLowerCase();
            if (name.includes(query)) {
                label.style.display = 'flex';
            } else {
                label.style.display = 'none';
            }
        });
    });

    // Filter supervisor list options on search input
    supervisorSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const labels = supervisorOptionsList.querySelectorAll('.option-label');
        labels.forEach(label => {
            const name = label.getAttribute('data-name').toLowerCase();
            if (name.includes(query)) {
                label.style.display = 'flex';
            } else {
                label.style.display = 'none';
            }
        });
    });

    // Admin Supervisor Modal Event Listeners
    adminAddSupervisorForm.addEventListener('submit', handleAddSupervisorSubmit);
    btnBulkSupervisorSubmit.addEventListener('click', handleBulkSupervisorSubmit);

    // Admin Status Modal Event Listeners
    adminAddStatusForm.addEventListener('submit', handleAddStatusSubmit);
    btnImportDefaultStatus.addEventListener('click', importDefaultStatuses);
    btnBulkStatusSubmit.addEventListener('click', handleBulkStatusSubmit);

    // Admin Property Modal Event Listeners
    adminAddPropertyForm.addEventListener('submit', handleAddPropertySubmit);
    btnImportPresetProperties.addEventListener('click', importPresetProperties);
    btnBulkPropertySubmit.addEventListener('click', handleBulkPropertySubmit);

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

    // Redraw charts if dashboard is visible
    if (dashboardViewSection && !dashboardViewSection.classList.contains('hidden')) {
        renderDashboard();
    }
}

// Calculate Day of Week from Date
function handleDateChange() {
    const dateVal = logDateInput.value;
    if (!dateVal) {
        logDayInput.value = '';
        return;
    }
    
    const date = parseDateSafely(dateVal);
    if (!date) {
        logDayInput.value = '';
        return;
    }
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
        return getCompareTime(b) - getCompareTime(a);
    });

    sortedEntries.forEach((entry) => {
        const tr = document.createElement('tr');
        tr.className = 'new-row';
        
        // Format Date to DD-MMM-YYYY (e.g. 22-Jun-2026) for table display
        const formattedDate = formatDateSafely(entry.date);

        const statusClass = entry.status ? entry.status.toLowerCase().replace(/ /g, '-') : '';

        const canEdit = currentUser && (
            currentUser.role === 'Admin' || 
            currentUser.role === 'Supervisor' || 
            !entry.createdBy || 
            entry.createdBy === currentUser.username
        );

        const actionsHtml = canEdit ? `
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
        ` : `<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">No Access</span>`;

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
            <td>${escapeHTML(Array.isArray(entry.assignedStaff) ? entry.assignedStaff.join(', ') : entry.assignedStaff)}</td>
            <td>${escapeHTML(Array.isArray(entry.assignedSupervisor) ? entry.assignedSupervisor.join(', ') : entry.assignedSupervisor)}</td>
            <td class="actions-col">
                ${actionsHtml}
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

    if (selectedStaff.length === 0) {
        alert('Please select at least one staff member.');
        return;
    }

    if (selectedSupervisors.length === 0) {
        alert('Please select at least one supervisor.');
        return;
    }

    const originalEntry = editId ? logEntries.find(item => item.id === editId) : null;
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
        assignedStaff: selectedStaff,
        assignedSupervisor: selectedSupervisors,
        createdBy: originalEntry ? (originalEntry.createdBy || 'admin') : (currentUser ? currentUser.username : 'admin')
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
    addToSyncQueue({ type: 'save_log', data: entryData });
    resetForm();
}

// Edit Mode Initiator
window.editEntry = function(id) {
    const entry = logEntries.find(item => item.id === id);
    if (!entry) return;

    // RBAC validation
    const canEdit = currentUser && (
        currentUser.role === 'Admin' || 
        currentUser.role === 'Supervisor' || 
        !entry.createdBy || 
        entry.createdBy === currentUser.username
    );
    if (!canEdit) {
        alert('Permission Denied: Staff members can only edit their own entries.');
        return;
    }

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

    // Set selected staff
    if (Array.isArray(entry.assignedStaff)) {
        selectedStaff = [...entry.assignedStaff];
    } else if (entry.assignedStaff) {
        selectedStaff = entry.assignedStaff.split(',').map(s => s.trim()).filter(Boolean);
    } else {
        selectedStaff = [];
    }
    
    // Check checkboxes matching selectedStaff
    const checkboxes = staffOptionsList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = selectedStaff.includes(cb.value);
    });
    
    syncStaffTagsUI();

    // Set selected supervisors
    if (Array.isArray(entry.assignedSupervisor)) {
        selectedSupervisors = [...entry.assignedSupervisor];
    } else if (entry.assignedSupervisor) {
        selectedSupervisors = entry.assignedSupervisor.split(',').map(s => s.trim()).filter(Boolean);
    } else {
        selectedSupervisors = [];
    }

    // Check checkboxes matching selectedSupervisors
    const supervisorCheckboxes = supervisorOptionsList.querySelectorAll('input[type="checkbox"]');
    supervisorCheckboxes.forEach(cb => {
        cb.checked = selectedSupervisors.includes(cb.value);
    });

    syncSupervisorTagsUI();

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

    // Reset custom multiselect
    selectedStaff = [];
    syncStaffTagsUI();
    const checkboxes = staffOptionsList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    // Reset supervisor custom multiselect
    selectedSupervisors = [];
    syncSupervisorTagsUI();
    const supervisorCheckboxes = supervisorOptionsList.querySelectorAll('input[type="checkbox"]');
    supervisorCheckboxes.forEach(cb => cb.checked = false);

    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    logDateInput.value = today;
    handleDateChange();
}

// Delete Log Entry
window.deleteEntry = function(id) {
    const entry = logEntries.find(item => item.id === id);
    if (!entry) return;

    // RBAC validation
    const canDelete = currentUser && (
        currentUser.role === 'Admin' || 
        currentUser.role === 'Supervisor' || 
        !entry.createdBy || 
        entry.createdBy === currentUser.username
    );
    if (!canDelete) {
        alert('Permission Denied: Staff members can only delete their own entries.');
        return;
    }

    if (confirm('Are you sure you want to delete this log entry?')) {
        logEntries = logEntries.filter(item => item.id !== id);
        saveEntries();
        addToSyncQueue({ type: 'delete_log', data: id });
        if (editId === id) resetForm();
    }
};

// Clear All Entries
function clearAllEntries() {
    if (logEntries.length === 0) return;

    // RBAC validation
    if (!currentUser || currentUser.role !== 'Admin') {
        alert('Permission Denied: Only administrators can clear all entries.');
        return;
    }

    if (confirm('CRITICAL: This will delete ALL logged entries permanently. Proceed?')) {
        logEntries = [];
        saveEntries();
        addToSyncQueue({ type: 'clear_all_logs', data: null });
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

// Robust Date Parsing
function parseDateSafely(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
        return null;
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return null;
    }
    const dateObj = new Date(year, month, day);
    if (isNaN(dateObj.getTime())) {
        return null;
    }
    return dateObj;
}

// Robust Date Formatting
function formatDateSafely(dateStr) {
    const dateObj = parseDateSafely(dateStr);
    if (!dateObj) {
        return dateStr || '-';
    }
    try {
        return dateObj.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-');
    } catch (e) {
        return dateStr || '-';
    }
}

// Robust Time/Date sorting comparison value generator
function getCompareTime(entry) {
    if (!entry) return 0;
    const dateStr = entry.date || '';
    const timeStr = entry.startTime || '00:00';
    
    let isoStr = '';
    if (dateStr.includes('-')) {
        isoStr = dateStr + 'T' + (timeStr.includes(':') ? timeStr : '00:00');
    }
    
    if (isoStr) {
        const d = new Date(isoStr);
        if (!isNaN(d.getTime())) {
            return d.getTime();
        }
    }
    
    const dateObj = parseDateSafely(dateStr);
    if (dateObj) {
        if (timeStr && timeStr.includes(':')) {
            const timeParts = timeStr.split(':');
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            if (!isNaN(hours) && !isNaN(minutes)) {
                dateObj.setHours(hours, minutes, 0, 0);
            }
        }
        return dateObj.getTime();
    }
    
    return 0;
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
            return getCompareTime(a) - getCompareTime(b);
        });

        // 5. Add data rows
        exportSortedEntries.forEach((entry) => {
            // Format date format for Excel cell (e.g. 22-Jun-2026)
            const excelFormattedDate = formatDateSafely(entry.date);

            const rowData = {
                date: excelFormattedDate,
                day: entry.day || '',
                propertyName: entry.propertyName || '',
                dutyType: entry.dutyType || '',
                startTime: entry.startTime || '',
                breakTime: entry.breakTime || '',
                endTime: entry.endTime || '',
                workDetail: entry.workDetail || '',
                status: entry.status || '',
                assignedStaff: Array.isArray(entry.assignedStaff) ? entry.assignedStaff.join(', ') : (entry.assignedStaff || ''),
                assignedSupervisor: Array.isArray(entry.assignedSupervisor) ? entry.assignedSupervisor.join(', ') : (entry.assignedSupervisor || '')
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
        alert('An error occurred while generating the Excel file: ' + error.message);
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
        if (!currentUser || currentUser.role !== 'Admin') {
            return;
        }
        adminModal.classList.remove('hidden');
        renderAdminStaffList();
        renderAdminSupervisorList();
        renderAdminStatusList();
        renderAdminPropertyList();
        renderAdminUserList();
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
    addToSyncQueue({ type: 'save_staff_dir', data: staffDirectory });
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

// Update form staff custom multiselect dropdown options
function updateStaffSelect() {
    staffOptionsList.innerHTML = '';
    
    if (staffDirectory.length === 0) {
        staffOptionsList.innerHTML = `
            <div style="color: var(--text-muted); padding: 10px; font-size: 0.9rem; text-align: center;">
                No staff available. Add in Admin Menu.
            </div>`;
        selectedStaff = [];
        syncStaffTagsUI();
        return;
    }
    
    // Sort alphabetically for clean display
    const sorted = [...staffDirectory].sort();
    sorted.forEach(name => {
        const label = document.createElement('label');
        label.className = 'option-label';
        label.setAttribute('data-name', name);
        
        const isChecked = selectedStaff.includes(name);
        
        label.innerHTML = `
            <input type="checkbox" value="${escapeHTML(name)}" ${isChecked ? 'checked' : ''}>
            <span>${escapeHTML(name)}</span>
        `;
        
        // Listen to checkbox changes
        const checkbox = label.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (!selectedStaff.includes(name)) {
                    selectedStaff.push(name);
                }
            } else {
                selectedStaff = selectedStaff.filter(item => item !== name);
            }
            syncStaffTagsUI();
        });
        
        staffOptionsList.appendChild(label);
    });
    
    // Cleanup selectedStaff of any deleted items
    selectedStaff = selectedStaff.filter(name => staffDirectory.includes(name));
    syncStaffTagsUI();
}

// Sync selection pills to UI Selectbox
function syncStaffTagsUI() {
    staffTagsContainer.innerHTML = '';
    
    if (selectedStaff.length === 0) {
        staffPlaceholder.style.display = 'block';
    } else {
        staffPlaceholder.style.display = 'none';
        selectedStaff.forEach(name => {
            const tag = document.createElement('span');
            tag.className = 'tag-pill';
            tag.innerHTML = `
                ${escapeHTML(name)}
                <span class="remove-tag" data-name="${escapeHTML(name)}">&times;</span>
            `;
            
            // Allow removal by clicking cross icon
            tag.querySelector('.remove-tag').addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid triggering select box toggle
                deselectStaffMember(name);
            });
            
            staffTagsContainer.appendChild(tag);
        });
    }
}

// Helper to remove tag
function deselectStaffMember(name) {
    selectedStaff = selectedStaff.filter(item => item !== name);
    const checkbox = staffOptionsList.querySelector(`input[type="checkbox"][value="${CSS.escape(name)}"]`);
    if (checkbox) checkbox.checked = false;
    syncStaffTagsUI();
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
    addToSyncQueue({ type: 'save_supervisor_dir', data: supervisorDirectory });
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

// Update form supervisor custom multiselect dropdown options
function updateSupervisorSelect() {
    supervisorOptionsList.innerHTML = '';
    
    if (supervisorDirectory.length === 0) {
        supervisorOptionsList.innerHTML = `
            <div style="color: var(--text-muted); padding: 10px; font-size: 0.9rem; text-align: center;">
                No supervisors available. Add in Admin Menu.
            </div>`;
        selectedSupervisors = [];
        syncSupervisorTagsUI();
        return;
    }
    
    // Sort alphabetically for clean display
    const sorted = [...supervisorDirectory].sort();
    sorted.forEach(name => {
        const label = document.createElement('label');
        label.className = 'option-label';
        label.setAttribute('data-name', name);
        
        const isChecked = selectedSupervisors.includes(name);
        
        label.innerHTML = `
            <input type="checkbox" value="${escapeHTML(name)}" ${isChecked ? 'checked' : ''}>
            <span>${escapeHTML(name)}</span>
        `;
        
        // Listen to checkbox changes
        const checkbox = label.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (!selectedSupervisors.includes(name)) {
                    selectedSupervisors.push(name);
                }
            } else {
                selectedSupervisors = selectedSupervisors.filter(item => item !== name);
            }
            syncSupervisorTagsUI();
        });
        
        supervisorOptionsList.appendChild(label);
    });
    
    // Cleanup selectedSupervisors of any deleted items
    selectedSupervisors = selectedSupervisors.filter(name => supervisorDirectory.includes(name));
    syncSupervisorTagsUI();
}

// Sync selection pills to UI Selectbox for supervisors
function syncSupervisorTagsUI() {
    supervisorTagsContainer.innerHTML = '';
    
    if (selectedSupervisors.length === 0) {
        supervisorPlaceholder.style.display = 'block';
    } else {
        supervisorPlaceholder.style.display = 'none';
        selectedSupervisors.forEach(name => {
            const tag = document.createElement('span');
            tag.className = 'tag-pill';
            tag.innerHTML = `
                ${escapeHTML(name)}
                <span class="remove-tag" data-name="${escapeHTML(name)}">&times;</span>
            `;
            
            // Allow removal by clicking cross icon
            tag.querySelector('.remove-tag').addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid triggering select box toggle
                deselectSupervisorMember(name);
            });
            
            supervisorTagsContainer.appendChild(tag);
        });
    }
}

// Helper to remove supervisor tag
function deselectSupervisorMember(name) {
    selectedSupervisors = selectedSupervisors.filter(item => item !== name);
    const checkbox = supervisorOptionsList.querySelector(`input[type="checkbox"][value="${CSS.escape(name)}"]`);
    if (checkbox) checkbox.checked = false;
    syncSupervisorTagsUI();
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
    renderTable();
    addToSyncQueue({ type: 'save_status_dir', data: statusDirectory });
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

// Property Directory Storage Methods
function loadPropertyDirectory() {
    const stored = localStorage.getItem('propertyDirectory');
    if (stored) {
        try {
            propertyDirectory = JSON.parse(stored);
        } catch (e) {
            propertyDirectory = [];
        }
    } else {
        propertyDirectory = [];
    }
    
    // Pre-populate defaults if directory is empty
    if (propertyDirectory.length === 0) {
        propertyDirectory = ["HDC Building", "Commercial Complex A", "Warehouse Zone 1", "Office Tower", "Industrial Park"];
        localStorage.setItem('propertyDirectory', JSON.stringify(propertyDirectory));
    }
    
    updatePropertySelect();
}

function savePropertyDirectory() {
    localStorage.setItem('propertyDirectory', JSON.stringify(propertyDirectory));
    updatePropertySelect();
    renderAdminPropertyList();
    addToSyncQueue({ type: 'save_property_dir', data: propertyDirectory });
}

// Add property via inline form
function handleAddPropertySubmit(e) {
    e.preventDefault();
    const name = newPropertyNameInput.value.trim();
    if (!name) return;
    
    if (propertyDirectory.some(existingName => existingName.toLowerCase() === name.toLowerCase())) {
        alert('This property already exists in the directory.');
        return;
    }
    
    propertyDirectory.push(name);
    savePropertyDirectory();
    newPropertyNameInput.value = '';
}

// Import preset properties
function importPresetProperties() {
    const presets = ["HDC Building", "Commercial Complex A", "Warehouse Zone 1", "Office Tower", "Industrial Park"];
    let countAdded = 0;
    
    presets.forEach(prop => {
        if (!propertyDirectory.some(existingName => existingName.toLowerCase() === prop.toLowerCase())) {
            propertyDirectory.push(prop);
            countAdded++;
        }
    });
    
    if (countAdded > 0) {
        savePropertyDirectory();
        alert(`Successfully imported ${countAdded} default properties.`);
    } else {
        alert('All default properties are already present.');
    }
}

// Bulk Import properties textarea
function handleBulkPropertySubmit() {
    const text = bulkPropertyInput.value;
    if (!text.trim()) {
        alert('Please enter or paste at least one property name.');
        return;
    }
    
    const names = text.split('\n');
    let countAdded = 0;
    
    names.forEach(name => {
        const trimmed = name.trim();
        if (trimmed && !propertyDirectory.some(existingName => existingName.toLowerCase() === trimmed.toLowerCase())) {
            propertyDirectory.push(trimmed);
            countAdded++;
        }
    });
    
    if (countAdded > 0) {
        savePropertyDirectory();
        bulkPropertyInput.value = '';
        alert(`Successfully imported ${countAdded} properties.`);
    } else {
        alert('No new properties were added (duplicates skipped).');
    }
}

// Delete property
window.deleteProperty = function(originalIndex) {
    const nameToDelete = propertyDirectory[originalIndex];
    if (confirm(`Remove "${nameToDelete}" from the property list? Existing entries with this property will remain.`)) {
        propertyDirectory.splice(originalIndex, 1);
        savePropertyDirectory();
    }
};

// Render property list inside modal
function renderAdminPropertyList() {
    adminPropertyList.innerHTML = '';
    propertyCountBadge.textContent = `${propertyDirectory.length} ${propertyDirectory.length === 1 ? 'property' : 'properties'}`;

    if (propertyDirectory.length === 0) {
        adminPropertyList.innerHTML = `
            <li style="color: var(--text-muted); justify-content: center; padding: 1.5rem; text-align: center;">
                List is empty. Add or import properties above.
            </li>`;
        return;
    }

    // Map names to their indexes first, then sort alphabetically
    const sorted = propertyDirectory
        .map((name, index) => ({ name, index }))
        .sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${escapeHTML(item.name)}</span>
            <button class="btn-action-icon delete" onclick="deleteProperty(${item.index})" title="Delete Property">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
        adminPropertyList.appendChild(li);
    });
}

// Update form property select dropdown options
function updatePropertySelect() {
    // Preserve current selection if any
    const currentValue = propertyNameInput.value;
    
    propertyNameInput.innerHTML = '<option value="" disabled selected>Select Property</option>';
    
    if (propertyDirectory.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.textContent = 'No properties available. Add in Admin Menu';
        propertyNameInput.appendChild(option);
        return;
    }
    
    // Sort alphabetically for easy dropdown browsing
    const sorted = [...propertyDirectory].sort();
    sorted.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        propertyNameInput.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (propertyDirectory.includes(currentValue)) {
        propertyNameInput.value = currentValue;
    }
}

// Native SHA-256 password hashing helper
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// User Directory storage methods
function loadUserDirectory() {
    const stored = localStorage.getItem('userDirectory');
    if (stored) {
        try {
            userDirectory = JSON.parse(stored);
        } catch (e) {
            userDirectory = [];
        }
    } else {
        userDirectory = [];
    }
}

function saveUserDirectory() {
    localStorage.setItem('userDirectory', JSON.stringify(userDirectory));
    renderAdminUserList();
    addToSyncQueue({ type: 'save_user_dir', data: userDirectory });
}

// Pre-seed default administrator user if no users exist
async function preseedDefaultAdmin() {
    if (userDirectory.length === 0) {
        const defaultHash = await hashPassword('admin123');
        userDirectory.push({
            id: 'u_' + Date.now(),
            name: 'System Admin',
            username: 'admin',
            passwordHash: defaultHash,
            role: 'Admin'
        });
        saveUserDirectory();
    }
}

// Initialize Auth
async function initAuth() {
    await preseedDefaultAdmin();
    
    // Check if session exists
    const storedSession = sessionStorage.getItem('currentLogUser');
    if (storedSession) {
        try {
            const user = JSON.parse(storedSession);
            // Verify user still exists in directory
            const exists = userDirectory.find(u => u.username === user.username && u.role === user.role);
            if (exists) {
                applyUserSession(user);
                return;
            }
        } catch (e) {
            // Clear corrupted session
            sessionStorage.removeItem('currentLogUser');
        }
    }
    
    // If no valid session, show login overlay
    loginOverlay.classList.remove('hidden');
    userBadge.classList.add('hidden');
    btnLogout.classList.add('hidden');
    btnAdminOpen.classList.add('hidden');
}

// Apply User Session after login or page reload
function applyUserSession(user) {
    currentUser = user;
    loginOverlay.classList.add('hidden');
    
    // Show Session elements in header
    userNameDisplay.textContent = user.name;
    userRoleDisplay.textContent = user.role;
    userBadge.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    
    // Restrict Admin Settings gear based on Role
    if (user.role === 'Admin') {
        btnAdminOpen.classList.remove('hidden');
    } else {
        btnAdminOpen.classList.add('hidden');
        toggleAdminModal(false); // Make sure modal closes if open
    }
    
    // Re-render logs table to respect role-based action column visibility
    renderTable();
}

// Handle Login submit
async function handleLoginSubmit(e) {
    e.preventDefault();
    const username = loginUsernameInput.value.trim().toLowerCase();
    const password = loginPasswordInput.value;
    
    if (!username || !password) return;
    
    const inputHash = await hashPassword(password);
    
    try {
        const response = await fetch('api.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, passwordHash: inputHash })
        });
        const data = await parseJSONResponse(response);
        
        if (data.success) {
            const sessionData = data.user;
            sessionStorage.setItem('currentLogUser', JSON.stringify(sessionData));
            applyUserSession(sessionData);
            
            loginUsernameInput.value = '';
            loginPasswordInput.value = '';
        } else {
            alert(data.message || 'Invalid username or password.');
        }
    } catch (error) {
        console.error('Network error during login, attempting local fallback:', error);
        
        const user = userDirectory.find(u => u.username.toLowerCase() === username);
        if (user && user.passwordHash) {
            if (user.passwordHash === inputHash) {
                const sessionData = {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    role: user.role
                };
                sessionStorage.setItem('currentLogUser', JSON.stringify(sessionData));
                applyUserSession(sessionData);
                
                loginUsernameInput.value = '';
                loginPasswordInput.value = '';
                return;
            }
        }
        alert('Invalid username or password, or server is offline.');
    }
}

// Handle Logout click
function handleLogoutClick() {
    sessionStorage.removeItem('currentLogUser');
    currentUser = null;
    
    // Hide UI elements
    userBadge.classList.add('hidden');
    btnLogout.classList.add('hidden');
    btnAdminOpen.classList.add('hidden');
    toggleAdminModal(false);
    
    // Show login overlay
    loginOverlay.classList.remove('hidden');
}

// Create new user via Admin tab
async function handleAddUserSubmit(e) {
    e.preventDefault();
    const name = newUserNameInput.value.trim();
    const username = newUserUsernameInput.value.trim().toLowerCase();
    const password = newUserPasswordInput.value;
    const role = newUserRoleSelect.value;
    
    if (!name || !username || !password || !role) return;
    
    if (userDirectory.some(u => u.username.toLowerCase() === username)) {
        alert('A user with this username already exists.');
        return;
    }
    
    const passHash = await hashPassword(password);
    
    userDirectory.push({
        id: 'u_' + Date.now(),
        name: name,
        username: username,
        passwordHash: passHash,
        role: role
    });
    
    saveUserDirectory();
    
    // Reset inputs
    newUserNameInput.value = '';
    newUserUsernameInput.value = '';
    newUserPasswordInput.value = '';
    newUserRoleSelect.value = 'Staff';
}

// Delete user row
window.deleteUser = function(userId) {
    const user = userDirectory.find(u => u.id === userId);
    if (!user) return;
    
    // Prevent self-deletion
    if (currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase()) {
        alert('You cannot delete your own account while logged in.');
        return;
    }
    
    // Prevent deleting default admin if it is the only Admin remaining
    const adminsCount = userDirectory.filter(u => u.role === 'Admin').length;
    if (user.role === 'Admin' && adminsCount <= 1) {
        alert('System must have at least one administrator account.');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the user "${user.name}" (${user.username})?`)) {
        userDirectory = userDirectory.filter(u => u.id !== userId);
        saveUserDirectory();
    }
};

// Render user directory list inside Admin settings modal
function renderAdminUserList() {
    adminUserList.innerHTML = '';
    userCountBadge.textContent = `${userDirectory.length} ${userDirectory.length === 1 ? 'user' : 'users'}`;
    
    if (userDirectory.length === 0) {
        adminUserList.innerHTML = `
            <li style="color: var(--text-muted); justify-content: center; padding: 1.5rem; text-align: center;">
                Directory is empty. Add users above.
            </li>`;
        return;
    }
    
    // Sort users alphabetically
    const sorted = [...userDirectory].sort((a, b) => a.name.localeCompare(b.name));
    
    sorted.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: 600;">${escapeHTML(user.name)}</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">@${escapeHTML(user.username)} &bull; <span class="badge" style="font-size: 0.7rem; padding: 1px 6px; background-color: var(--primary-light); color: var(--primary-color); border-radius: 8px;">${user.role}</span></span>
            </div>
            <button class="btn-action-icon delete" onclick="deleteUser('${user.id}')" title="Delete User">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
        adminUserList.appendChild(li);
    });
}

// iOS PWA Install Prompt Tooltip initializer
function initIOSInstallPrompt() {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // Detect standalone mode (already installed/running as PWA)
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    // Check if dismissed previously
    const isDismissed = localStorage.getItem('iosInstallPromptDismissed') === 'true';

    // If it's iOS, not running in standalone, and not dismissed, show the prompt
    if (isIOS && !isStandalone && !isDismissed) {
        // Create element
        const promptDiv = document.createElement('div');
        promptDiv.id = 'ios-install-prompt';
        promptDiv.className = 'ios-install-prompt';
        
        promptDiv.innerHTML = `
            <div class="prompt-header">
                <span class="prompt-title">Install App on iOS</span>
                <button id="close-ios-prompt" class="close-prompt" aria-label="Close prompt">&times;</button>
            </div>
            <p class="prompt-body" style="margin: 0; font-size: 0.875rem;">
                Tap the Share icon
                <svg class="ios-share-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px; color: var(--primary-color); vertical-align: middle; margin: 0 4px;">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                at the bottom of Safari, and select <strong>Add to Home Screen</strong>.
            </p>
        `;
        
        document.body.appendChild(promptDiv);
        
        // Trigger reflow and show with slide up transition
        setTimeout(() => {
            promptDiv.classList.add('show');
        }, 1500); // Wait 1.5 seconds after page loads to avoid cluttering immediately

        // Dismiss listener
        document.getElementById('close-ios-prompt').addEventListener('click', () => {
            promptDiv.classList.remove('show');
            localStorage.setItem('iosInstallPromptDismissed', 'true');
            // Remove from DOM after transition
            setTimeout(() => {
                promptDiv.remove();
            }, 400);
        });
    }
}

// Parse time string 'HH:MM' into minutes
function parseTimeToMinutes(t) {
    if (!t) return 0;
    const parts = t.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Calculate shift hours dynamically from an entry
function calculateShiftHours(entry) {
    if (!entry.startTime || !entry.endTime) return 0;
    
    const startMin = parseTimeToMinutes(entry.startTime);
    let endMin = parseTimeToMinutes(entry.endTime);
    
    // Crosses midnight
    if (endMin < startMin) {
        endMin += 24 * 60;
    }
    
    let durationMin = endMin - startMin;
    
    // Parse break minutes
    let breakMin = 0;
    const breakVal = entry.breakTime ? entry.breakTime.trim() : '';
    if (breakVal && breakVal !== '-') {
        if (breakVal.includes(':')) {
            breakMin = parseTimeToMinutes(breakVal);
        } else {
            const num = parseFloat(breakVal);
            if (!isNaN(num)) {
                if (breakVal.toLowerCase().includes('min')) {
                    breakMin = num;
                } else {
                    breakMin = num * 60; // hours to minutes
                }
            }
        }
    }
    
    const workedMin = Math.max(0, durationMin - breakMin);
    return parseFloat((workedMin / 60).toFixed(1));
}

// Render PWA Dashboard Metrics and Visual Charts
function renderDashboard() {
    if (logEntries.length === 0) {
        // Reset metrics
        kpiTotalLogs.textContent = '0';
        kpiTotalHours.textContent = '0h';
        kpiTotalProperties.textContent = '0';
        kpiPendingLogs.textContent = '0';
        
        // Destroy existing chart instances if any
        if (chartStatus) { chartStatus.destroy(); chartStatus = null; }
        if (chartProperty) { chartProperty.destroy(); chartProperty = null; }
        if (chartTimeline) { chartTimeline.destroy(); chartTimeline = null; }
        return;
    }

    // 1. Calculate KPI Metrics
    const totalLogs = logEntries.length;
    
    let totalHours = 0;
    const propertySet = new Set();
    let pendingCount = 0;
    
    logEntries.forEach(entry => {
        totalHours += calculateShiftHours(entry);
        if (entry.propertyName) {
            propertySet.add(entry.propertyName);
        }
        if (entry.status === 'Pending' || entry.status === 'In Progress') {
            pendingCount++;
        }
    });

    kpiTotalLogs.textContent = totalLogs;
    kpiTotalHours.textContent = totalHours.toFixed(1) + 'h';
    kpiTotalProperties.textContent = propertySet.size;
    kpiPendingLogs.textContent = pendingCount;

    // 2. Set colors based on active theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#334155';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const primaryColor = '#10b981';

    // 3. Compile Data for Charts
    
    // Status Distribution
    const statusCounts = {};
    logEntries.forEach(entry => {
        const s = entry.status || 'Pending';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const statusLabels = Object.keys(statusCounts);
    const statusData = Object.values(statusCounts);
    
    // Properties Distribution
    const propertyCounts = {};
    logEntries.forEach(entry => {
        const p = entry.propertyName || 'Unknown';
        propertyCounts[p] = (propertyCounts[p] || 0) + 1;
    });
    // Sort descending by count
    const sortedProperties = Object.keys(propertyCounts)
        .map(key => ({ name: key, count: propertyCounts[key] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Take top 5
    const propertyLabels = sortedProperties.map(p => p.name);
    const propertyData = sortedProperties.map(p => p.count);

    // Timeline Trend (Last 7 active dates)
    const dateCounts = {};
    logEntries.forEach(entry => {
        if (entry.date) {
            dateCounts[entry.date] = (dateCounts[entry.date] || 0) + 1;
        }
    });
    // Sort dates ascending
    const sortedDates = Object.keys(dateCounts).sort();
    const lastDates = sortedDates.slice(-7); // Take last 7 dates
    const timelineLabels = lastDates.map(d => {
        // Format to DD-MMM (e.g. 22-Jun)
        const dateObj = parseDateSafely(d);
        if (!dateObj) return d || '-';
        try {
            return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        } catch (e) {
            return d || '-';
        }
    });
    const timelineData = lastDates.map(d => dateCounts[d]);

    // 4. Initialize or update Chart.js instances
    
    // Status Donut Chart
    if (chartStatus) {
        chartStatus.destroy();
    }
    const ctxStatus = document.getElementById('chart-status-distribution').getContext('2d');
    chartStatus = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: statusLabels,
            datasets: [{
                data: statusData,
                backgroundColor: [
                    '#ef4444', // Pending (red)
                    '#f97316', // In Progress (orange)
                    '#10b981', // Completed (green)
                    '#3b82f6', // Other statuses
                    '#8b5cf6',
                    '#ec4899'
                ],
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: { family: 'Outfit', weight: '500' }
                    }
                }
            }
        }
    });

    // Property Horizontal Bar Chart
    if (chartProperty) {
        chartProperty.destroy();
    }
    const ctxProperty = document.getElementById('chart-property-distribution').getContext('2d');
    chartProperty = new Chart(ctxProperty, {
        type: 'bar',
        data: {
            labels: propertyLabels,
            datasets: [{
                label: 'Duties Logged',
                data: propertyData,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, precision: 0 }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });

    // Timeline Line Chart
    if (chartTimeline) {
        chartTimeline.destroy();
    }
    const ctxTimeline = document.getElementById('chart-timeline-trend').getContext('2d');
    chartTimeline = new Chart(ctxTimeline, {
        type: 'line',
        data: {
            labels: timelineLabels,
            datasets: [{
                label: 'Duties per Day',
                data: timelineData,
                borderColor: primaryColor,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                fill: true,
                tension: 0.3,
                borderWidth: 3,
                pointBackgroundColor: primaryColor,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, precision: 0 }
                }
            }
        }
    });
}
