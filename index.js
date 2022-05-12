// Require the necessary discord.js classes
const { Client, Intents, Permissions } = require('discord.js');
const { token } = require('./config.json');
const { exec } = require('child_process');
//const { fetch } = require('node-fetch@2');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const myIntents = new Intents(
  ['DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILDS']
)

const client = new Client({ intents: myIntents });

function fixedEncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}

client.once('ready', c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if(message.author.userName=='audiobot') return
  if(message.content=='moo')message.channel.send('who let the cows out?')


  msg=message.content
  chan=message.channel.guild.name == '𝐍𝐎𝐓𝐂𝐎𝐑𝐏' ? 'NOTCORP' : message.channel.guild.name

  let dotCommand = ''
  if(msg.indexOf('.') !== -1) dotCommand = msg.split('.')[1].toLowerCase()

  if(dotCommand == 'coinflip' || dotCommand == 'coin' || dotCommand == 'flip' || dotCommand == 'toss'){
    exec('php coinflip.php' , (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return
      }
      if(stdout){
        let img = stdout
        message.channel.send(img);
      }
    })
	}

  if(dotCommand == 'quiz'){
    const quiz = require('./quiz.json');
    const item = quiz[Math.floor(Math.random() * quiz.length)];
    const filter = response => {
      return item.answers.some(answer => answer.toLowerCase() === response.content.toLowerCase());
    };

    message.reply(item.question, { fetchReply: true })
      .then(() => {
        message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
          .then(collected => {
            score = 0
            exec(`php quiz.php '${collected.first().author}'` , (error, stdout, stderr) => {
              if (error) {
                console.log(`error: ${error.message}`)
                return
              }
              if (stderr) {
                console.log(`stderr: ${stderr}`)
                return
              }
              if(stdout){
                score = stdout
								message.channel.send(`${collected.first().author} got the correct answer!\n${collected.first().author} score: ${score}`);
              }
            })
          })
          .catch(collected => {
            message.channel.send('Looks like nobody got the answer this time.');
          });
      });
  }




  let l=false
  if((msg.toLowerCase()).indexOf(l='.wordle ')!==-1){
    params = msg.toLwerCase().split(' ').filter(v=>v)
    knownLetters = params[1]
    placement = params[2]
  }
  if((msg.toLowerCase()).indexOf(l='https://www.youtube.com')!==-1
    || (msg.toLowerCase().indexOf(l='https://youtu.be')!==-1
  )){
		let sendData = {playlist: chan}
    const response = await fetch('https://audiobot.dweet.net/create.php', {
    	method: 'post',
    	body: JSON.stringify(sendData),
    	headers: {'Content-Type': 'application/json'}
    });
    const data = await response.json();
    if(data[0]){
      let link = ((msg.substring(msg.indexOf(l)).trim())).split(' ')[0]
      l=''
      if((l=link.split('?')).length){
        l=l.filter(v=>v.indexOf('v=')!==-1)
        if(l.length) l=l[l.length-1].split('v=')[1].split('&')[0]
      }
      if(!l || !l[0]){
        l=link.split('/')
        l=l[l.length-1]
      }
      let videoID = l
      if(videoID.length >= 8 && videoID.length <=15){
        exec("php addTrack.php " + videoID + " '" + chan.split('').filter(v=>v!='#').join('')+"'", (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`)
            return
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`)
            return
          }
          if(stdout){
            let res = JSON.parse(stdout)
            let trackTitle = res[2]
            let trackDescription = res[3].split('').filter((v,i)=>i<200).join('') + (res[3].length>200 ? '...' : '')
            let hours = res[4].length == 1 ? '0' + res[4] : res[4]
            let minutes = res[5].length == 1 ? '0' + res[5] : res[5]
            let seconds = res[6].length == 1 ? '0' + res[6] : res[6]
            let thumbnail = res[7]
            exec('cd /var/www/html/shorty; php shorty.php ' +  'https://audiobot.dweet.net/'+fixedEncodeURIComponent(chan.split('').filter(v=>v!='#').join(''))+'/t/' + fixedEncodeURIComponent(res[1]), (error, stdout, stderr)=>{
              if (error) {
                console.log(`error: ${error.message}`)
                return
              }
              if (stderr) {
                console.log(`stderr: ${stderr}`)
                return
              }
              if(stdout){
                let shortLink = 'https://shorty.dweet.net/' + stdout.split("\n")[0]
                let send = 'audio only for "' + trackTitle + "\"\n" + shortLink +
                //'\n\ndescription: ' + trackDescription + 
                //' ' + thumbnail +
                '\nduration: ' + hours + ':' + minutes + ':' + seconds + "\n" +
                "https://audiobot.dweet.net/" + fixedEncodeURIComponent(chan.split('').filter(v=>v!='#').join(''))
                // for https://youtu.be/' + l
                //serverRaw('PRIVMSG ' + chan + ' :' + send + "\r\n")
                message.channel.send(send)
              }
            })
          } else {
            console.log('word not found :(')
          }
        })
      }
    }
  }
});

client.on('interactionCreate', async interaction => {


  if(!interaction.isCommand()) return;
  const { commandName } = interaction;

	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	} else if (commandName === 'server') {
		await interaction.reply('Server info.');
	} else if (commandName === 'user') {
		await interaction.reply('User info.');
	} else if (commandName === 'quiz') {
    const quiz = require('./quiz.json');
    const item = quiz[Math.floor(Math.random() * quiz.length)];
    const filter = response => {
      return item.answers.some(answer => answer.toLowerCase() === response.content.toLowerCase());
    };

    interaction.reply(item.question, { fetchReply: true })
      .then(() => {
        interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
          .then(collected => {
						score = 0
            exec(`php quiz.php '${collected.first().author}'` , (error, stdout, stderr) => {
              if (error) {
                console.log(`error: ${error.message}`)
                return
              }
              if (stderr) {
                console.log(`stderr: ${stderr}`)
                return
              }
              if(stdout){
                score = stdout
                interaction.followUp(`${collected.first().author} got the correct answer!\n${collected.first().author} score: ${score}`);
              }
      			})
            //interaction.followUp(`${collected.first().author} got the correct answer!\n${collected.first().author} score: ${score}`);
          })
          .catch(collected => {
            interaction.followUp('Looks like nobody got the answer this time.');
          });
      });
  }
});

client.login(token);
