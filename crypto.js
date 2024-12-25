const crypto = require('crypto');

const iv = crypto.randomBytes(16); //генерация вектора инициализации
const key = crypto.scryptSync('secret', 'salt', 32); //генерация ключа

let cipherStream = crypto.createCipheriv(
    'aes-256-cbc',
    key,
    iv
);

console.log(key)

let encryptedData = '';

cipherStream.on(
    'data',
    (data) => (encryptedData += data.toString('hex'))
);

cipherStream.write('Any data');
cipherStream.end();

let decipherStream = crypto.createDecipheriv(
    'aes-256-cbc',
    key,
    iv
);

let decryptedData = '';

decipherStream.on(
    'data',
    (data) => (decryptedData += data)
);
decipherStream.on('end', () => console.log(decryptedData)); //'Any data'

decipherStream.write(encryptedData, 'hex');
decipherStream.end();