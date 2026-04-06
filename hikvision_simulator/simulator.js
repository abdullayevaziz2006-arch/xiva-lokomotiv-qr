const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json()); // JSON parsing

const VALID_USER = 'admin';
const VALID_PASS = 'admin12345';

// Simulating Basic Authentication Middleware
function basicAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Hikvision-Terminal-Sim"');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const auth = authHeader.split(' ')[1];
    const decoded = Buffer.from(auth, 'base64').toString('ascii');
    const [user, pass] = decoded.split(':');

    if (user !== VALID_USER || pass !== VALID_PASS) {
        return res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
    }

    next();
}

function generateSuccessJSON(requestURL) {
    return {
        ResponseStatus: {
            requestURL: requestURL,
            statusCode: 1,
            statusString: 'OK',
            subStatusCode: 'ok',
            errorCode: 0,
            errorMsg: 'ok'
        }
    };
}

// Device Info Endpoint (Admin test uchun)
app.get('/ISAPI/System/deviceInfo', basicAuth, (req, res) => {
    console.log('Received DeviceInfo request');
    res.status(200).json({
        DeviceInfo: {
            deviceName: 'Hikvision Simulator',
            deviceID: 'DS-K1T671M',
            deviceDescription: 'Face Recognition Terminal Simulator',
            deviceLocation: 'Test Location',
            macAddress: '00:00:00:00:00:00',
            serialNumber: '123456789'
        }
    });
});

app.post('/ISAPI/AccessControl/UserInfo/Record', basicAuth, (req, res) => {
    console.log('Received UserInfo JSON payload:', JSON.stringify(req.body, null, 2));
    res.status(200).json(generateSuccessJSON('/ISAPI/AccessControl/UserInfo/Record'));
});

app.post('/ISAPI/AccessControl/CardInfo/Record', basicAuth, (req, res) => {
    console.log('Received CardInfo JSON payload:', JSON.stringify(req.body, null, 2));
    res.status(200).json(generateSuccessJSON('/ISAPI/AccessControl/CardInfo/Record'));
});

// AcsEvent Search Endpoint
app.post('/ISAPI/AccessControl/AcsEvent', basicAuth, (req, res) => {
    const { AcsEventCond } = req.body;
    console.log('Received AcsEvent Search request:', JSON.stringify(req.body, null, 2));
    
    // Simulate finding the events
    const response = {
        AcsEvent: {
            searchID: AcsEventCond?.searchID || "1",
            totalMatches: 3,
            numOfMatches: 3,
            InfoList: [
                {
                    major: 5,
                    minor: 0,
                    time: new Date().toISOString(),
                    employeeNoString: "QR12345678", 
                    cardNo: "QR12345678",
                    name: "Demo User",
                    eventSource: "terminal",
                    currentVerifyMode: "face+card"
                },
                {
                    major: 5,
                    minor: 0,
                    time: new Date().toISOString(),
                    employeeNoString: "QadamboyevJamshid", // For testing Jamshid's case
                    cardNo: "QadamboyevJamshid",
                    name: "Qadamboyev Jamshid",
                    eventSource: "terminal",
                    currentVerifyMode: "face+card"
                },
                {
                    major: 5,
                    minor: 0,
                    time: new Date().toISOString(),
                    employeeNoString: "7134713", 
                    cardNo: "7134713",
                    name: "Test Admin",
                    eventSource: "terminal",
                    currentVerifyMode: "face+card"
                }
            ]
        }
    };
    res.status(200).json(response);
});

// Simulation Trigger: Backendga "Skaner qildim" deb xabar yuborish
// Masalan: http://localhost:8081/simulate-scan/Qadamboyev Jamshid?ip=10.70.7.50
app.get('/simulate-scan/:idOrName', async (req, res) => {
    const { idOrName } = req.params;
    const terminalIp = req.query.ip || '10.70.7.50'; // Default: Kema
    const backendUrl = 'http://localhost:5000/api/events';
    
    const isName = idOrName.includes(' ') || !/\d/.test(idOrName);

    console.log(`[Simulator] Skanerlash simulyatsiyasi -> ${isName ? 'ISM' : 'ID'}: ${idOrName}, Terminal: ${terminalIp}`);
    
    const mockEvent = {
        AccessControlEvent: {
            employeeNoString: !isName ? idOrName : "123456",
            name: isName ? idOrName : "Simulated User",
            major: 5,
            minor: 1,
            dateTime: new Date().toISOString(),
            eventDescription: "Access Allowed (Simulated Webhook)"
        }
    };

    try {
        await axios.post(backendUrl, mockEvent, {
            headers: { 'x-terminal-ip': terminalIp }
        });
        res.send(`Muvaffaqiyatli! Backend (${idOrName}) uchun ${terminalIp} terminali orqali xabardor qilindi.`);
    } catch (error) {
        console.error('[Simulator] Backendga yuborishda xato:', error.message);
        res.status(500).send("Backendga ulanib bo'lmadi: " + error.message);
    }
});


const PORT = 8081;
app.listen(PORT, () => {
    console.log(`Hikvision Terminal JSON Simulator is listening on http://localhost:${PORT}`);
    console.log('Requires Basic Auth (Login: admin / admin12345)');
    console.log('Test uchun: http://localhost:8081/simulate-scan/QR_KOD_ID');
});
