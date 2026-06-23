// Cloudflare Pages Function API - V1.0.1
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || '';
    
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Response Helper
    const jsonResponse = (data, status = 200) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: corsHeaders
        });
    };

    // Auto initialize schema
    try {
        await initDatabaseSchema(env.DB);
    } catch (dbError) {
        return jsonResponse({
            error: true,
            message: 'Failed to initialize D1 database schema: ' + dbError.message
        }, 500);
    }

    // Parse JSON body if present
    let body = {};
    if (request.method === 'POST') {
        try {
            body = await request.json();
        } catch (e) {
            // No body or invalid JSON
        }
    }

    switch (action) {
        case 'login': {
            const username = (body.username || '').trim().toLowerCase();
            const passwordHash = (body.passwordHash || '').trim();
            
            const user = await env.DB.prepare("SELECT id, name, username, role, password_hash FROM users WHERE LOWER(username) = LOWER(?)")
                .bind(username)
                .first();
                
            if (user && user.password_hash === passwordHash) {
                return jsonResponse({
                    success: true,
                    user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        role: user.role
                    }
                });
            } else {
                return jsonResponse({
                    success: false,
                    message: 'Invalid username or password.'
                });
            }
        }

        case 'init_app': {
            // Fetch daily logs
            const { results: logs } = await env.DB.prepare("SELECT * FROM daily_logs").all();
            for (let log of logs) {
                try {
                    log.assignedStaff = JSON.parse(log.assignedStaff);
                } catch(e) {
                    log.assignedStaff = typeof log.assignedStaff === 'string' ? log.assignedStaff.split(', ').filter(Boolean) : [];
                }
                try {
                    log.assignedSupervisor = JSON.parse(log.assignedSupervisor);
                } catch(e) {
                    log.assignedSupervisor = typeof log.assignedSupervisor === 'string' ? log.assignedSupervisor.split(', ').filter(Boolean) : [];
                }
            }

            // Fetch directories
            const { results: staffRows } = await env.DB.prepare("SELECT name FROM staff ORDER BY name ASC").all();
            const staff = staffRows.map(r => r.name);

            const { results: supervisorRows } = await env.DB.prepare("SELECT name FROM supervisors ORDER BY name ASC").all();
            const supervisors = supervisorRows.map(r => r.name);

            const { results: statusRows } = await env.DB.prepare("SELECT name FROM statuses ORDER BY name ASC").all();
            const statuses = statusRows.map(r => r.name);

            const { results: propertyRows } = await env.DB.prepare("SELECT name FROM properties ORDER BY name ASC").all();
            const properties = propertyRows.map(r => r.name);

            // Fetch users (exclude hash)
            const { results: users } = await env.DB.prepare("SELECT id, name, username, role FROM users").all();

            return jsonResponse({
                success: true,
                logs,
                staff,
                supervisors,
                statuses,
                properties,
                users
            });
        }

        case 'save_log': {
            const log = body.log;
            if (!log) {
                return jsonResponse({ success: false, message: 'No log data provided' }, 400);
            }

            const assignedStaff = JSON.stringify(log.assignedStaff || []);
            const assignedSupervisor = JSON.stringify(log.assignedSupervisor || []);

            await env.DB.prepare(`
                INSERT INTO daily_logs (id, date, day, propertyName, dutyType, startTime, breakTime, endTime, workDetail, status, assignedStaff, assignedSupervisor, createdBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    date = excluded.date,
                    day = excluded.day,
                    propertyName = excluded.propertyName,
                    dutyType = excluded.dutyType,
                    startTime = excluded.startTime,
                    breakTime = excluded.breakTime,
                    endTime = excluded.endTime,
                    workDetail = excluded.workDetail,
                    status = excluded.status,
                    assignedStaff = excluded.assignedStaff,
                    assignedSupervisor = excluded.assignedSupervisor,
                    createdBy = excluded.createdBy
            `).bind(
                log.id,
                log.date,
                log.day,
                log.propertyName,
                log.dutyType,
                log.startTime,
                log.breakTime || '-',
                log.endTime,
                log.workDetail,
                log.status,
                assignedStaff,
                assignedSupervisor,
                log.createdBy
            ).run();

            return jsonResponse({ success: true });
        }

        case 'delete_log': {
            const id = body.id || '';
            if (!id) {
                return jsonResponse({ success: false, message: 'No ID provided' }, 400);
            }

            await env.DB.prepare("DELETE FROM daily_logs WHERE id = ?").bind(id).run();
            return jsonResponse({ success: true });
        }

        case 'clear_all_logs': {
            await env.DB.prepare("DELETE FROM daily_logs").run();
            return jsonResponse({ success: true });
        }

        case 'sync_logs': {
            const logs = body.logs || [];
            if (logs.length === 0) {
                return jsonResponse({ success: true, message: 'No logs to sync' });
            }

            const statements = [];
            for (let log of logs) {
                const assignedStaff = JSON.stringify(log.assignedStaff || []);
                const assignedSupervisor = JSON.stringify(log.assignedSupervisor || []);
                
                statements.push(
                    env.DB.prepare(`
                        INSERT INTO daily_logs (id, date, day, propertyName, dutyType, startTime, breakTime, endTime, workDetail, status, assignedStaff, assignedSupervisor, createdBy)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            date = excluded.date,
                            day = excluded.day,
                            propertyName = excluded.propertyName,
                            dutyType = excluded.dutyType,
                            startTime = excluded.startTime,
                            breakTime = excluded.breakTime,
                            endTime = excluded.endTime,
                            workDetail = excluded.workDetail,
                            status = excluded.status,
                            assignedStaff = excluded.assignedStaff,
                            assignedSupervisor = excluded.assignedSupervisor,
                            createdBy = excluded.createdBy
                    `).bind(
                        log.id,
                        log.date,
                        log.day,
                        log.propertyName,
                        log.dutyType,
                        log.startTime,
                        log.breakTime || '-',
                        log.endTime,
                        log.workDetail,
                        log.status,
                        assignedStaff,
                        assignedSupervisor,
                        log.createdBy
                    )
                );
            }

            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }

        case 'save_staff_dir': {
            const staff = body.staff || [];
            const statements = [env.DB.prepare("DELETE FROM staff")];
            for (let name of staff) {
                if (name.trim()) {
                    statements.push(env.DB.prepare("INSERT INTO staff (name) VALUES (?)").bind(name.trim()));
                }
            }
            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }

        case 'save_supervisor_dir': {
            const supervisors = body.supervisors || [];
            const statements = [env.DB.prepare("DELETE FROM supervisors")];
            for (let name of supervisors) {
                if (name.trim()) {
                    statements.push(env.DB.prepare("INSERT INTO supervisors (name) VALUES (?)").bind(name.trim()));
                }
            }
            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }

        case 'save_status_dir': {
            const statuses = body.statuses || [];
            const statements = [env.DB.prepare("DELETE FROM statuses")];
            for (let name of statuses) {
                if (name.trim()) {
                    statements.push(env.DB.prepare("INSERT INTO statuses (name) VALUES (?)").bind(name.trim()));
                }
            }
            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }

        case 'save_property_dir': {
            const properties = body.properties || [];
            const statements = [env.DB.prepare("DELETE FROM properties")];
            for (let name of properties) {
                if (name.trim()) {
                    statements.push(env.DB.prepare("INSERT INTO properties (name) VALUES (?)").bind(name.trim()));
                }
            }
            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }

        case 'save_user_dir': {
            const users = body.users || [];
            if (users.length === 0) {
                return jsonResponse({ success: false, message: 'User directory cannot be completely empty.' }, 400);
            }

            // Get current user IDs
            const incomingIds = users.map(u => u.id);
            
            // Delete users from DB not in the incoming list
            const placeholders = incomingIds.map(() => '?').join(',');
            await env.DB.prepare(`DELETE FROM users WHERE id NOT IN (${placeholders})`).bind(...incomingIds).run();

            const statements = [];
            for (let u of users) {
                const existing = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(u.id).first();
                
                if (existing) {
                    statements.push(
                        env.DB.prepare("UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?")
                            .bind(u.name, u.username, u.role, u.id)
                    );
                } else {
                    const passHash = u.passwordHash || '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2'; // fallback default
                    statements.push(
                        env.DB.prepare("INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
                            .bind(u.id, u.name, u.username, passHash, u.role)
                    );
                }
            }

            await env.DB.batch(statements);
            return jsonResponse({ success: true });
        }

        default:
            return jsonResponse({ success: false, message: 'Invalid action: ' + action }, 400);
    }
}

async function initDatabaseSchema(db) {
    if (!db) {
        throw new Error('D1 database binding "DB" is missing. Please bind your D1 database to the Pages project.');
    }
    
    // Create tables in batch
    await db.batch([
        db.prepare(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `),
        db.prepare(`
            CREATE TABLE IF NOT EXISTS staff (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        `),
        db.prepare(`
            CREATE TABLE IF NOT EXISTS supervisors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        `),
        db.prepare(`
            CREATE TABLE IF NOT EXISTS statuses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        `),
        db.prepare(`
            CREATE TABLE IF NOT EXISTS properties (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        `),
        db.prepare(`
            CREATE TABLE IF NOT EXISTS daily_logs (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                day TEXT NOT NULL,
                propertyName TEXT NOT NULL,
                dutyType TEXT NOT NULL,
                startTime TEXT NOT NULL,
                breakTime TEXT DEFAULT '-',
                endTime TEXT NOT NULL,
                workDetail TEXT NOT NULL,
                status TEXT NOT NULL,
                assignedStaff TEXT NOT NULL,
                assignedSupervisor TEXT NOT NULL,
                createdBy TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
    ]);

    // Pre-seed admin user if empty
    const result = await db.prepare("SELECT COUNT(*) as count FROM users").first();
    if (result && result.count === 0) {
        await db.prepare("INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
            .bind(
                'u_' + Date.now(),
                'System Admin',
                'admin',
                '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2', // admin123
                'Admin'
            )
            .run();
    }
}
