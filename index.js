const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
const PORT = 8080;

let mysql = require('mysql');
require('dotenv').config();

const crypto = require('crypto');

const fs = require('fs');
const tar = require('tar');
const path = require('path');

const jwt = require('jsonwebtoken');

const repositories = path.join(__dirname, '/repositories/');

let connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const auths = [];

let iv = crypto.getRandomValues(new Uint8Array(16));

const ecdh = crypto.createECDH('secp256k1');
const publicKey = crypto.generateKeys();

function checkAuthHeader(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed token' });
    }

    const token = authHeader.slice(7);

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

async function extractTarGz(archivePath, outputDir) {
    try {
        if (!fs.existsSync(archivePath)) throw new Error(`Archive not found: ${archivePath}`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        await tar.x({
            file: archivePath,
            cwd: outputDir,
            gzip: true,
            strict: true
        });

        console.log(`Extraction complete: ${outputDir}`);

        fs.unlinkSync(archivePath, (err) => {
            if (err) {
                console.error(`Error deleting file: ${err.message}`);
                return;
            }
            console.log(`Archive deleted successfully: ${archivePath}`);
        });
    } catch (err) {
        console.error(`Extraction failed: ${err.message}`);
    }
}

function decryptFile(key, iv, filePath, newPath) {
    return new Promise((resolve, reject) => {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const input = fs.createReadStream(path.join(__dirname, filePath));
        const output = fs.createWriteStream(path.join(__dirname, newPath));

        input.pipe(decipher).pipe(output);

        output.on('finish', () => {
            console.log('Decryption complete.');
            resolve();
        });
        output.on('error', reject);
        input.on('error', reject);
    });
}

function encryptFile(key, iv, filePath, newPath) {
    return new Promise((resolve, reject) => {
        const cypher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const input = fs.createReadStream(path.join(__dirname, filePath));
        const output = fs.createWriteStream(path.join(__dirname, newPath));

        input.pipe(cypher).pipe(output);

        output.on('finish', () => {
            console.log('Encryption complete.');
            resolve();
        });
        output.on('error', reject);
        input.on('error', reject);
    });
}

app.use("/protected/", checkAuthHeader);
app.use(express.json());

connection.connect((err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the MySQL server.');

    app.get("/", (req, res) => {
        res.send("ZR8Net version 1.0.0");
    });

    app.post("/protected/auth", (req, res) => {
        const clientPublicKey = Buffer.from(req.body.number, 'hex');
        const secret = ecdh.computeSecret(clientPublicKey);

        const id = crypto.generateKey('aes', 128);

        res.json({ number: publicKey, id: id.export().toString('hex') });

        const hkdfKey = crypto.hkdfSync(
            'sha256',
            buffer,
            Buffer.alloc(0),
            Buffer.from('file-encryption'),
            32
        );

        const auth = Buffer.from(hkdfKey);

        auths.push(auth);

        const key = Buffer.from(process.env.KEY, 'hex');

        decryptFile(key, iv, 'keys.dat', 'keys.json');

        const keysDecrypted = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json')));

        keysDecrypted[id] = auth;

        iv = crypto.getRandomValues(new Uint8Array(16));

        fs.writeFileSync(path.join(__dirname, 'keys.json'), JSON.stringify(keysDecrypted));

        encryptFile(key, iv, 'keys.json', 'keys.dat');
        fs.unlinkSync(path.join(__dirname, 'keys.json'));
    });

    app.post("/protected/push", (req, res) => {
        const bodyjson = req.json;

        if (!req.files) return res.status(400).send('No files were uploaded.');

        const file = req.files[0];
        const fileName = file.name;
        const filePath = path.join(__dirname, '/repositories/', fileName);

        file.mv(filePath, (err) => {
            if (err) return res.status(500).send(err);

            res.send(`File ${fileName} uploaded successfully.`);




            extractTarGz(filePath, repositories);
        });
    });


    app.listen(PORT, () => {
        console.log("Server running on port " + PORT);
    });
});