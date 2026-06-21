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
    const data = {
        "sdfo98jh": "cuh",
        "beans": "dih"
    };

    const key = Buffer.from(process.env.KEY, 'hex');

    fs.writeFileSync(path.join(__dirname, 'keys.json'), JSON.stringify(data));

    await encryptFile(key, iv, 'keys.json', 'keys.dat');
    fs.unlinkSync(path.join(__dirname, 'keys.json'));
}

main().catch(console.error);