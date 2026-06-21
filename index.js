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

async function main() {
    const key = Buffer.from(process.env.KEY, 'hex');

    await decryptFile(key, iv, 'keys.dat', 'keys.json');

    const file = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json')));
    file["124098u"] = "30hsdlfkh2983h";
    fs.writeFileSync(path.join(__dirname, 'keys.json'), JSON.stringify(file));

    await encryptFile(key, iv, 'keys.json', 'keys.dat');

    fs.unlinkSync(path.join(__dirname, 'keys.json'));
    console.log("Successfully deleted decrypted file.");
}

main().catch(console.error);

/*

connection.connect((err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the MySQL server.');

    app.get("/", (req, res) => {
        res.send("ZR8Net version 1.0.0");
    });

    app.post("/auth", (req, res) => {
        const buffer = new ArrayBuffer(32);
        const view = new DataView(buffer);
        view.setUint32(0, req.json.number, true);

        const n1 = new Uint8Array(buffer);
        const n2 = crypto.getRandomValues(new Uint8Array(32));

        const id = crypto.generateKey('aes', { length: 512 });

        res.json({ number: Array.from(n2), id: id.export().toString('hex') });

        const auth = new Uint8Array(32);

        for (let i = 0; i < 32; i++) {
            auth[i] = n1[i] ^ n2[i];
        }

        auths.push(auth);

        const key = Buffer.from(process.env.KEY, 'hex');

        decryptFile(key, iv, 'keys.dat', 'keys.json');

        const keysDecrypted = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json')));

        keysDecrypted[id] = key;

        fs.writeFileSync(path.join(__dirname, 'keys.json'), JSON.stringify(keysDecrypted));

        iv = crypto.getRandomValues(new Uint8Array(16));


    });

    app.post("/push", (req, res) => {
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
}); */