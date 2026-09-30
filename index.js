const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const P = require('pino')
let games = {}
let scores = {}
async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({ logger: P({ level: 'silent' }), printQRInTerminal: false, auth: state, browser: ['Toji-Bot', 'Chrome', '1.0'] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) { console.log('================ QR ================'); qrcode.generate(qr, { small: true }) }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) start()
        } else if (connection === 'open') { console.log('Toji Bot اشتغل!') }
    })
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim().toLowerCase()
        const reply = async (txt) => { await sock.sendMessage(from, { text: txt }, { quoted: m }) }
        if (text === 'الاوامر') { return reply(`🎮 TOJI BOT\n\n1. اكس او\n2. حجر\n3. خمن\n4. سؤال\n5. نقاطي`) }
        if (text === 'اكس او') { games[from] = { board: ['1','2','3','4','5','6','7','8','9'], turn: 'X' }; return reply(`لعبة بدت!\n1 | 2 | 3\n---------\n4 | 5 | 6\n---------\n7 | 8 | 9\nاكتب رقم`) }
        if (games[from]?.board && /^[1-9]$/.test(text)) {
            let g = games[from], idx = parseInt(text)-1
            if (['X','O'].includes(g.board[idx])) return reply('مليانة!')
            g.board[idx] = g.turn
            const win = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(([a,b,c])=> g.board[a]===g.board[b] && g.board[b]===g.board[c])
            if (win) { scores[from]=(scores[from]||0)+10; delete games[from]; return reply(`فاز ${g.turn}! +10`) }
            g.turn = g.turn==='X'?'O':'X'
            return reply(`${g.board[0]} | ${g.board[1]} | ${g.board[2]}\n---------\n${g.board[3]} | ${g.board[4]} | ${g.board[5]}\n---------\n${g.board[6]} | ${g.board[7]} | ${g.board[8]}\nدور: ${g.turn}`)
        }
        if (['حجر','ورقة','مقص'].includes(text)) { let bot = ['حجر','ورقة','مقص'][Math.floor(Math.random()*3)]; return reply(`انت:${text} انا:${bot}`) }
        if (text==='خمن') { games[from]={type:'guess',num:Math.floor(Math.random()*100)+1}; return reply('خمنت رقم 1-100') }
        if (games[from]?.type==='guess') { let n=parseInt(text); if(n===games[from].num){delete games[from]; return reply('صح!')} return reply(n>games[from].num?'اقل':'اكبر') }
        if (text==='نقاطي') return reply(`نقاطك: ${scores[from]||0}`)
    })
}
start()
