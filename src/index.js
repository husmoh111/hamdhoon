// Cloudflare Worker Entry Point - MongoDB Atlas - V1.0.0
import { MongoClient } from 'mongodb';

let mongoClient = null;
let db = null;

async function getDatabase(connectionString) {
    if (db) return db;
    
    // Connect to MongoDB Atlas with serverless-optimized options
    mongoClient = new MongoClient(connectionString, {
        maxPoolSize: 5,
        minPoolSize: 0,
        maxIdleTimeMS: 10000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
    });
    await mongoClient.connect();
    db = mongoClient.db('hamdhoon'); // Database name
    return db;
}

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            
            // If it's an API request, handle it with our serverless DB API logic
            if (url.pathname.startsWith('/api')) {
                return await handleApiRequest(request, env);
            }
            
            // Otherwise, serve static assets
            return await env.ASSETS.fetch(request);
        } catch (error) {
            console.error('Unhandled Worker Error:', error);
            const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            };
            return new Response(JSON.stringify({
                error: true,
                message: 'Unhandled server error: ' + error.message,
                stack: error.stack
            }), {
                status: 500,
                headers: corsHeaders
            });
        }
    }
};

async function handleApiRequest(request, env) {
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

    // Auto initialize schema & connect to MongoDB
    let database = null;
    try {
        const connectionString = env.MONGODB_URI;
        if (!connectionString) {
            throw new Error('MONGODB_URI environment variable is missing.');
        }
        database = await getDatabase(connectionString);
        try {
            await seedDefaultAdmin(database);
        } catch (seedError) {
            console.error('Seeding default admin failed:', seedError);
        }
    } catch (dbError) {
        return jsonResponse({
            error: true,
            message: 'Failed to connect to MongoDB Database: ' + dbError.message
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
            
            const user = await database.collection('users').findOne({
                username: { $regex: `^${username}$`, $options: 'i' }
            });
                
            if (user && user.passwordHash === passwordHash) {
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
            const logs = await database.collection('daily_logs').find({}).toArray();
            for (let log of logs) {
                // Ensure array format for staff and supervisor
                if (!Array.isArray(log.assignedStaff)) {
                    log.assignedStaff = typeof log.assignedStaff === 'string' ? JSON.parse(log.assignedStaff) : [];
                }
                if (!Array.isArray(log.assignedSupervisor)) {
                    log.assignedSupervisor = typeof log.assignedSupervisor === 'string' ? JSON.parse(log.assignedSupervisor) : [];
                }
            }

            // Fetch directories
            const staffRows = await database.collection('staff').find({}).sort({ name: 1 }).toArray();
            const staff = staffRows.map(r => r.name);

            const supervisorRows = await database.collection('supervisors').find({}).sort({ name: 1 }).toArray();
            const supervisors = supervisorRows.map(r => r.name);

            const statusRows = await database.collection('statuses').find({}).sort({ name: 1 }).toArray();
            const statuses = statusRows.map(r => r.name);

            const propertyRows = await database.collection('properties').find({}).sort({ name: 1 }).toArray();
            const properties = propertyRows.map(r => r.name);

            // Fetch users (exclude hash)
            const userRows = await database.collection('users').find({}).toArray();
            const users = userRows.map(u => ({
                id: u.id,
                name: u.name,
                username: u.username,
                role: u.role
            }));

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

            await database.collection('daily_logs').updateOne(
                { id: log.id },
                {
                    $set: {
                        id: log.id,
                        date: log.date,
                        day: log.day,
                        propertyName: log.propertyName,
                        dutyType: log.dutyType,
                        startTime: log.startTime,
                        breakTime: log.breakTime || '-',
                        endTime: log.endTime,
                        workDetail: log.workDetail,
                        status: log.status,
                        assignedStaff: log.assignedStaff || [],
                        assignedSupervisor: log.assignedSupervisor || [],
                        createdBy: log.createdBy,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );

            return jsonResponse({ success: true });
        }

        case 'delete_log': {
            const id = body.id || '';
            if (!id) {
                return jsonResponse({ success: false, message: 'No ID provided' }, 400);
            }

            await database.collection('daily_logs').deleteOne({ id });
            return jsonResponse({ success: true });
        }

        case 'clear_all_logs': {
            await database.collection('daily_logs').deleteMany({});
            return jsonResponse({ success: true });
        }

        case 'sync_logs': {
            const logs = body.logs || [];
            if (logs.length === 0) {
                return jsonResponse({ success: true, message: 'No logs to sync' });
            }

            const bulkOps = logs.map(log => ({
                updateOne: {
                    filter: { id: log.id },
                    update: {
                        $set: {
                            id: log.id,
                            date: log.date,
                            day: log.day,
                            propertyName: log.propertyName,
                            dutyType: log.dutyType,
                            startTime: log.startTime,
                            breakTime: log.breakTime || '-',
                            endTime: log.endTime,
                            workDetail: log.workDetail,
                            status: log.status,
                            assignedStaff: log.assignedStaff || [],
                            assignedSupervisor: log.assignedSupervisor || [],
                            createdBy: log.createdBy,
                            updatedAt: new Date()
                        }
                    },
                    upsert: true
                }
            }));

            await database.collection('daily_logs').bulkWrite(bulkOps);
            return jsonResponse({ success: true });
        }

        case 'save_staff_dir': {
            const staff = body.staff || [];
            await database.collection('staff').deleteMany({});
            if (staff.length > 0) {
                const docs = staff.filter(name => name.trim()).map(name => ({ name: name.trim() }));
                if (docs.length > 0) {
                    await database.collection('staff').insertMany(docs);
                }
            }
            return jsonResponse({ success: true });
        }

        case 'save_supervisor_dir': {
            const supervisors = body.supervisors || [];
            await database.collection('supervisors').deleteMany({});
            if (supervisors.length > 0) {
                const docs = supervisors.filter(name => name.trim()).map(name => ({ name: name.trim() }));
                if (docs.length > 0) {
                    await database.collection('supervisors').insertMany(docs);
                }
            }
            return jsonResponse({ success: true });
        }

        case 'save_status_dir': {
            const statuses = body.statuses || [];
            await database.collection('statuses').deleteMany({});
            if (statuses.length > 0) {
                const docs = statuses.filter(name => name.trim()).map(name => ({ name: name.trim() }));
                if (docs.length > 0) {
                    await database.collection('statuses').insertMany(docs);
                }
            }
            return jsonResponse({ success: true });
        }

        case 'save_property_dir': {
            const properties = body.properties || [];
            await database.collection('properties').deleteMany({});
            if (properties.length > 0) {
                const docs = properties.filter(name => name.trim()).map(name => ({ name: name.trim() }));
                if (docs.length > 0) {
                    await database.collection('properties').insertMany(docs);
                }
            }
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
            await database.collection('users').deleteMany({ id: { $nin: incomingIds } });

            for (let u of users) {
                const existing = await database.collection('users').findOne({ id: u.id });
                
                if (existing) {
                    await database.collection('users').updateOne(
                        { id: u.id },
                        { $set: { name: u.name, username: u.username, role: u.role } }
                    );
                } else {
                    const passHash = u.passwordHash || '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // fallback default
                    await database.collection('users').insertOne({
                        id: u.id,
                        name: u.name,
                        username: u.username,
                        passwordHash: passHash,
                        role: u.role,
                        createdAt: new Date()
                    });
                }
            }

            return jsonResponse({ success: true });
        }

        default:
            return jsonResponse({ success: false, message: 'Invalid action: ' + action }, 400);
    }
}

async function seedDefaultAdmin(database) {
    const usersCollection = database.collection('users');
    const count = await usersCollection.countDocuments();
    if (count === 0) {
        await usersCollection.insertOne({
            id: 'u_' + Date.now(),
            name: 'System Admin',
            username: 'admin',
            passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
            role: 'Admin',
            createdAt: new Date()
        });
    } else {
        // Correct the password hash for default admin if it is currently 'root' (4813494d...)
        await usersCollection.updateOne(
            { username: 'admin', passwordHash: '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2' },
            { $set: { passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' } }
        );
    }
}
