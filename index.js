const https = require('https');
const fs = require("fs");
const TelegramApi = require('node-telegram-bot-api')
const { gameOptions, againOptions, types } = require('./options');

const token = '6946681054:AAEOvH7d7xwKsZcceD5i9pabun0RExgKtFw'

const bot = new TelegramApi(token, { polling: true })

const chats = {}
let BTCWallet = '';
let price = 0;
let course = {};
const commission = 0.2;
let isStelsNotes = false;
let stelsNotes = [];
let temporaryMsgIDs = [];

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
        let priceN = 0;
        const isStart = text === '/start';

        if (!msg.text) {
            return;
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

        if (isStart) {
            //const user = await UserModel.findOne({chatId})
            //await UserModel.create({chatId})

            // Приветствие
            await bot.sendSticker(chatId, 'https://media.stickerswiki.app/moneybitcoin_byalexzhdanov/6412776.512.webp')
            bot.sendMessage(chatId, `Привет!  ${msg.from.first_name} 🤝

Самый Выгодный и Быстрый обмен в нашем сервисе!
🤷 Возникла проблема с заказом или вопрос /help
⚙️ Если завис бот, используй /start

Уверен, Мы обязательно Подружимся!`);
            
            // Меню
            await bot.sendMessage(chatId, `Меню бота`, {

                reply_markup: {
                    keyboard: [
                        ['✅ Пополнить', '🈺 Текущий курс'],
                        ['🥷 Мои заявки', '❓ Помощь'],
                        ['/stels', '/getStels', '/clearStels']
                    ],
                    resize_keyboard: true
                }

            });
        }

        if (text === '/clearStels') {
            temporaryMsgIDs.push(message_id);
            clearStels();

            const res = await bot.sendMessage(chatId, 'Заметки удалены');

            setTimeout(async () => {
                bot.deleteMessage(chatId, res.message_id);
            }, 3000);

            return;
        }

        if (text === '/getStels') {
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
                /* console.log(stelsNotes);
                stelsNotes.forEach(async item => {
                    if (item.msg) {
                        await bot.sendMessage(chatId, item.msg.text);
                    }
                    if (item.img) {
                        //bot.sendPhoto(chatId, './image/file_0.jpg');
    
                        const photoId = item.img.photo[item.img.photo.length-1].file_id;
    
                        const imageStream = fs.createReadStream('./image/' + photoId + '.jpg');
                        await bot.sendPhoto(chatId, imageStream, {
    
                            caption: item.img.caption,
                            parse_mode: 'HTML'
    
                        });
                    }
                }); */
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

        if (text === '/stels') {
            temporaryMsgIDs.push(message_id);

            isStelsNotes = !isStelsNotes;
            if (!isStelsNotes) {
                clearStels();
                const res = await bot.sendMessage(chatId, 'Заметки сохранены');

                setTimeout(async () => {
                    bot.deleteMessage(chatId, res.message_id);
                }, 3000);

                return;
            }

            try {
                const res = await bot.sendMessage(chatId, `Режим заметок. Данный раздел позволяет оставлять скрытые заметки. \n\n Отправьте текст или фото, которые хотите сохранить. \n\n По окончанию наберите опять в чате /stels чтобы выйти из режима и скрыть сообщения. \n\n Для того чтобы посмотреть сохраненные заметки, наберите /getStels \n\n Чтобы очистить все заметки, наберите /clearStels`);
                temporaryMsgIDs.push(res.message_id)
            } catch (error) {
                console.log(error);
                return;
            }
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

    /* bot.on('callback_query', async msg => {
        const data = msg.data;
        const chatId = msg.message.chat.id;
        if (data === '/again') {
            return startGame(chatId)
        }
        const user = await UserModel.findOne({ chatId })
        if (data == chats[chatId]) {
            user.right += 1;
            await bot.sendMessage(chatId, `Поздравляю, ты отгадал цифру ${chats[chatId]}`, againOptions);
        } else {
            user.wrong += 1;
            await bot.sendMessage(chatId, `К сожалению ты не угадал, бот загадал цифру ${chats[chatId]}`, againOptions);
        }
        await user.save();
    }) */
}

start();
