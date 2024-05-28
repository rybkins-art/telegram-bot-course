const https = require('https');
const fs = require("fs");
const TelegramApi = require('node-telegram-bot-api')
const { gameOptions, againOptions, types } = require('./options');
const { clearInterval } = require('timers');

const token = '6946681054:AAEOvH7d7xwKsZcceD5i9pabun0RExgKtFw'



const bot = new TelegramApi(token, { polling: true })

let BTCWallet = '';
let price = 0;
let course = {};
const commission = 0.2;
let isStelsNotes = false;
let stelsNotes = [];
let temporaryMsgIDs = [];
let autoHideNotesID = 0;

function between(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    )
}

function isNumber(value) {
    return typeof value === 'number' && isFinite(value) && value > 0;
}

function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}
    

async function getCourse() {
    const apiUrl = 'https://api.coinbase.com/v2/prices/BTC-RUB/spot';
    let getCoursePromise = new Promise((resolve, reject) => {
        var data = '';
        https.get(apiUrl, res => {
            res.on('data', chunk => { data += chunk }) 
            res.on('end', () => {
               resolve(data);
            })
        }) 
    });

    const response = await getCoursePromise;
    data = JSON.parse(response);
    course = data.data;
}

const start = async () => {
    getCourse();

    bot.setMyCommands([
        { command: '/start', description: '♻️ Перезапустить бота' },
        { command: '/help', description: '🙏 Создать тикет' },
        /* {command: '/info', description: 'Получить информацию о пользователе'},
        {command: '/game', description: 'Игра угадай цифру'}, */
    ])

    bot.on('message', async msg => {
        const text = msg.text;
        const chatId = msg.chat.id;
        const message_id = msg.message_id;
        const isStart = text === '/start' || text === 'Отмена';
        const autoHideNotes = 5 * 60 * 1000;

        const mainMenu = {
            reply_markup: {
                keyboard: [
                    ['✅ Пополнить', '🈺 Текущий курс'],
                    ['🥷 Мои заявки', '❓ Помощь'],
                    ['Мои заметки']
                ],
                resize_keyboard: true
            }
        }

        if (!msg.text) {
            return;
        }

        if (isStelsNotes) {
            clearTimeout(autoHideNotesID);
            autoHideNotesID = setTimeout(hideNotes, autoHideNotes);
        }
        

        function clearStels() {
            stelsNotes.forEach(item => {
                try {
                    bot.deleteMessage(chatId, item.id);
                } catch (error) {
                    console.log(error)
                }
            });
            temporaryMsgIDs.forEach(id => {
                try {
                    bot.deleteMessage(chatId, id);
                } catch (error) {
                    console.log(error)
                }
            });
        }

        async function showNotes() {
            try {
                const res = await bot.sendMessage(chatId, `Режим заметок. Данный раздел позволяет оставлять скрытые заметки. \n\n Отправьте текст или фото, которые хотите сохранить. \n\n Автосохранение через 5 мин, при бездействии в чате`, {
                    reply_markup: {
                        keyboard: [
                            ['Сохранить и скрыть'],
                            ['Отмена'],
                        ],
                        resize_keyboard: true
                    }
                });
                temporaryMsgIDs.push(res.message_id)
            } catch (error) {
                console.log(error);
                return;
            }
        }

        async function hideNotes() {
            clearStels();
            startMenu();

            return;
        }

        async function startMenu() {
            // Приветствие
            await bot.sendSticker(chatId, 'https://media.stickerswiki.app/moneybitcoin_byalexzhdanov/6412776.512.webp')
            bot.sendMessage(chatId, `Привет!  ${msg.from.first_name} 🤝 \n\n Самый Выгодный и Быстрый обмен в нашем сервисе! \n🤷 Возникла проблема с заказом или вопрос /help
⚙️ Если завис бот, используй /start`);
            
            // Меню
            await bot.sendMessage(chatId, 'Уверен, Мы обязательно Подружимся!', mainMenu);
        }

        if (isStart) {
            bot.deleteMessage(chatId, message_id);
            clearStels();
            isStelsNotes = false;

            startMenu();
            return;
        }

        if (text === 'Удалить все заметки') {
            temporaryMsgIDs.push(message_id);
            clearStels();
            
            stelsNotes = [];
            const res = await bot.sendMessage(chatId, 'Заметки удалены');
            temporaryMsgIDs.push(res.message_id);

            setTimeout(async () => {
                hideNotes();
            }, 3000);

            return;
        }

        if (text === 'Показать мои заметки') {
            temporaryMsgIDs.push(message_id);

            try {
                async function forEachStels(item) {
                    if (!item) {
                        return;
                    }
                    if (item.msg) {
                        const res = await bot.sendMessage(chatId, item.msg.text);
                        temporaryMsgIDs.push(res.message_id);
                    }
                    if (item.img) {
                        //bot.sendPhoto(chatId, './image/file_0.jpg');
    
                        const photoId = item.img.photo[item.img.photo.length-1].file_id;
    
                        const imageStream = fs.createReadStream('./image/' + photoId + '.jpg');
                        const res = await bot.sendPhoto(chatId, imageStream, {
    
                            caption: item.img.caption,
                            parse_mode: 'HTML'
    
                        });

                        temporaryMsgIDs.push(res.message_id)
                    }

                    const indexStels = stelsNotes.indexOf(item);
                    const nextIndex = indexStels + 1;
                    if (nextIndex < stelsNotes.length) {
                        forEachStels(stelsNotes[nextIndex]);
                    }
                }

                forEachStels(stelsNotes[0]);
                
                if (!stelsNotes.length) {
                    await bot.sendMessage(chatId, 'Список заметок пуст');
                }
                bot.deleteMessage(chatId, message_id);
                return;
            } catch (error) {
                console.log(error)
            }

            return;
        }

        if (text === 'Сохранить и скрыть') {
            isStelsNotes = false;
            temporaryMsgIDs.push(message_id);
            clearTimeout(autoHideNotesID);

            const res = await bot.sendMessage(chatId, 'Заметки сохранены');
            temporaryMsgIDs.push(res.message_id);

            setTimeout(async () => {
                hideNotes();
            }, 3000);
            return;
        }

        if (text === 'Мои заметки') {
            isStelsNotes = true;
            temporaryMsgIDs.push(message_id);

            showNotes();
            return;
        }

        if (isStelsNotes) {
            stelsNotes.push({
                id: msg.message_id,
                msg,
            });

            return;
            //isStelsNotes = false;
        }

        console.log(`${msg.from.username}: ${msg.text}`)

        try {
            //getCourse();
            if (text.includes('Мои заявки')) {
                return bot.sendMessage(chatId, `Данный раздел в разработке. Скоро все будет пацаны`);
            }

            if (text.includes('Пополнить')) {
                return bot.sendMessage(chatId, `👛 Введите адрес BTC который хотите пополнить`);
            }

            if (text.includes('Текущий курс')) {
                let currentCourse = (parseFloat(course.amount)).toFixed(2)
                return bot.sendMessage(chatId, `Текущий курс: 1 ₿ = ${currentCourse}`);
            }


            // Парсим кошелек
            if (!!~text.search(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/g)) {
                BTCWallet = text;
                return bot.sendMessage(chatId, `💰 Введите сумму на которую хотите пополнить. В рублях или биткоинах. \n\n Текущая комиссия: ${commission*100}%`);
            }

            // Парсим сумму
            if ( isNumber(parseInt(text)) || isFloat(parseFloat(text)) ) {
                if (!BTCWallet) {
                    return bot.sendMessage(chatId, `👛 Введите адрес BTC который хотите пополнить`);
                }

                let wallet2BTC = '';
                let BTC2rub = '';

                if ( isNumber(parseInt(text)) ) {
                    if ( parseInt(text) < 2000 ) {
                        return bot.sendMessage(chatId, `⚠️ Минимальная сумма обмена 2000 ₽`);
                    }

                    BTC2rub = parseInt(text);
                    price = BTC2rub;

                    wallet2BTC = (1 / course.amount * price) + '';
                    wallet2BTC = wallet2BTC.substring(0, 10);
                    wallet2BTC = `${parseFloat(wallet2BTC)} BTC`
                    
                    cW = '₽'

                } else if ( isFloat(parseFloat(text)) ) {
                    let minBTC =  (1 / course.amount * 2000) + '';
                    minBTC = minBTC.substring(0, 10);
                    minBTC = parseFloat(minBTC);

                    if ( course.amount * parseFloat(text) < 2000 ) {
                        return bot.sendMessage(chatId, `⚠️ Минимальная сумма обмена ${minBTC} BTC`);
                    }

                    BTC2rub = Math.floor( price / (1 / course.amount ) );

                    price = parseFloat(text); 
                    wallet2BTC = price;
                    cW = 'BTC'
                }

                BTC2rubCom = BTC2rub + BTC2rub * commission;
                
                bot.sendMessage(chatId, `Заявка на пополнение кошелька: 👛 <b>${BTCWallet}</b> \n\n 💰На сумму: ${BTC2rub} руб. \n\n Если все верно, переведите на карту: <code>5536 9141 7151 6218</code> \n\n ${BTC2rubCom} руб - комиссия ${commission * 100}% \n\n Вы получите на счет: ${wallet2BTC}`, { parse_mode: "HTML" });
            }
            
            if (text === '/help' || text.includes('Помощь')) {
                return bot.sendMessage(chatId, `Если у Вас возникли проблемы с обменом, обратитесь к @dmitriyrybkins`);
            }
        } catch (e) {
            console.log(e)
            return bot.sendMessage(chatId, 'Неизвестная команда..)');
        }

    });

    bot.on('photo', async img => {
        const chatId = img.chat.id;

        const downloadFolder = './image';
        if (isStelsNotes) {
            stelsNotes.push({
                id: img.message_id,
                img,
            });
        }

        try {
            //await bot.downloadFile(img.photo[img.photo.length-1].file_id, './image');
            const photoId = img.photo[img.photo.length-1].file_id;
            await bot.downloadFile(photoId, downloadFolder).then(function (filePath) {

                let absoluteFile = downloadFolder + '/' + photoId +'.jpg';
            
                fs.rename(filePath, absoluteFile, function (err, response) {
            
                    console.log(absoluteFile);
            
                    if (err) {
                        return console.log(err);
                    }
            
                });
            });
        }
        catch(error) {
            console.log(error);
        }
    });
}

start();
