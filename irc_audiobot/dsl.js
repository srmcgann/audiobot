"use strict";
var parse = require('parse-link')
var shellescape = require('shell-escape');
const { exec } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
var Meta = require('html-metadata-parser');
var chans = []
var fullLine
var joined = false
exports.__esModule = true;
exports.on = exports.message = exports.reply = exports.server = exports.Connect = exports.ƛ = void 0;
var types_1 = require("./types");
var Irc = require("./irc");
var State = {
    connection: types_1.None,
    auth: types_1.Some({
        server: process.argv[2],
        nick: process.argv[3],
        channel: process.argv[4]
    }),
    port: types_1.None,
    message: types_1.None,
    line: types_1.None,
    error: types_1.None,
    connected: false
};
function fixedEncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}
String.prototype.replaceAll = function (target, payload) {
    let regex = new RegExp(target, 'g')
    return this.valueOf().replace(regex, payload)
};
function applyMany(context, applied) {
    applied.forEach(function (callback) {
        types_1.match(context.line, function (line) {
          callback.apply(line);
        }, function (_) {
            console.warn('context was insufficient');
        });
    });
}

function cowsay(msg, chan){
  let str = msg.substring(8)
  exec(shellescape(('cowsay ' + str).split(' ')), (error, stdout, stderr) => {
    stdout.split("\n").map(v=>{
      serverRaw('PRIVMSG ' + chan + ' : ' + v + "\r\n")
    })
  })
}

var mashword=[]

function getNewMash(str, chan){
  let meta = ''
  let scrambleLength = typeof mashword[chan] !== 'undefined' ? mashword[chan].scrambleLength : ''
  console.log(str)
  if((+str)>1 && (+str)<=10){
    scrambleLength = ' '+str
    meta = '    (the scramble length has been set to' + scrambleLength + ")"
  }
  exec('php masher.php newmash' + scrambleLength, (error, stdout, stderr) => {
    let v=stdout.split("\n")
    mashword[chan] = {answer: v[0].trim(), scramble: v[1], scrambleLength}
    serverRaw('PRIVMSG ' + chan + ' :a new scramble is served!  ->  ' + v[1] + meta + "\r\n")
  })
}

function wordcombos (letters) {
  let result
  if (letters.length <= 1) {
    result = letters
  } else {
    result = []
    for (let i = 0; i < letters.length; ++i) {
      let firstword = letters[i]
      let remainingletters = []
      for (let j = 0; j < letters.length; ++j) {
        if ( i != j ) remainingletters.push(letters[j])
      }
      let combos = wordcombos(remainingletters)
      for (let j = 0; j < combos.length; ++j) {
        result.push(firstword + combos[j])
      }
    }
  }
  return result
}

function checkMash(str, chan, chatter){
  let answer = mashword[chan].answer.toUpperCase().split('')
  let guess = str.trim().toUpperCase()//.split('')
  let wc = wordcombos(answer)
  if(guess.length !== answer.join('').length || (wc.indexOf(guess)===-1)){
    serverRaw('PRIVMSG ' + chan + ' :Oops! you\'re not using the correct letters!  current scramble  ->  ' + mashword[chan].scramble + "\r\n");
  } else {
    if(guess == answer.join('')){
      exec('php incrscore.php ' + chatter, (error, stdout, stderr) => {
        let score = stdout
        serverRaw('PRIVMSG ' + chan + ' :\u000352,1C\u000353,1O\u000354,1R\u000356,1R\u000357,1E\u000358,1C\u000360,1T\u000361,1!\u0003    "' + guess + '"    \u000356,1 ' + chatter + ' score: ' + score + " \u0003 \r\n")
        getNewMash('', chan)
      })
    }
    //serverRaw('PRIVMSG ' + chan + ' : ' + guess + ' ' + answer.join('') + ' ' + wc[0] + ' ' + wc.indexOf(guess) + ' ' + wc[wc.indexOf(guess)] + "\r\n")
  }
}

function wordmash(msg, chan, chatter){
  let str = msg.trim().substring(10)
  if(Object.keys(mashword).length && typeof mashword[chan] !== 'undefined' && mashword[chan].scramble.length){
    switch(str.split(' ')[0].toUpperCase()){
      case 'STOP':
        serverRaw('PRIVMSG ' + chan + ' :' + 'scramble stopped... ' + "\r\n")
        mashword[chan] = {answer: '', scramble: '', scrambleLength: mashword[chan].scrambleLength}
      break
      case 'RESET':
        let l
        getNewMash((l=str.split(' '))[l.length-1], chan)
      break
      case 'HINT':
        serverRaw('PRIVMSG ' + chan + ' :' + "the current answer is: " + mashword[chan].answer.split('').map((v,i,a)=>i<=a.length/2?'*':v).join('') + "\r\n");
      break
      default:
        if(str.length<1 || !str){
          serverRaw('PRIVMSG ' + chan + ' :' + "the current scramble is: " + mashword[chan].scramble + "\r\n");
        }else{
          checkMash(str, chan, chatter)
        }
      break
    }
  }else{
    getNewMash(str, chan)
  }
}

function escapeShellArg (arg) {
    return "'" + arg.split('').map(v=>v=="'"?'\'':v).join('') + "'";
}


function addTrackByYTID(videoID, chan){
  let command
        exec(command = "php addTrack.php " + videoID + " '" + chan.split('').filter(v=>v!='#').join('')+"'", (error, stdout, stderr) => {
    if (error) {
      console.log('command')
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log(command)
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
      exec(command = 'curl -s https://shorty.dweet.net/shorty.php?https://audiobot.dweet.net/'+fixedEncodeURIComponent(chan.split('').filter(v=>v!='#').join(''))+'/t/' + fixedEncodeURIComponent(res[1]), (error, stdout, stderr)=>{
        if (error) {
          console.log(command)
          console.log(`error: ${error.message}`)
          return
        }
        if (stderr) {
          console.log(command)
          console.log(`stderr: ${stderr}`)
          return
        }
        if(stdout){
          console.log(stdout+"\n")
          let playlistPage = "https://audiobot.dweet.net/" + fixedEncodeURIComponent(chan.split('').filter(v=>v!='#').join(''))
          let shortLink = 'https://shorty.dweet.net/' + stdout.split("\n")[0]
          let duration = 'duration: ' + hours + ':' + minutes + ':' + seconds
          let send = shortLink + ' <- audio only for "' + trackTitle + "\" " + '[ https://youtu.be/'+videoID+' ]'
          serverRaw('PRIVMSG ' + chan + ' :' + send + "\r\n")
        }
      })
    } else {
      console.log('word not found :(')
    }
  })
}


async function imgToAscii(img, chan){
  let ret = []
  await exec(shellescape(('php getImageSize.php ' + img).split(' ')), async (error, stdout, stderr) => {
    await stdout.split("\n").map(async function (v){
      if(v.length>3){
        let dimensions=JSON.parse(v)
        let width = Math.max(1920, dimensions['0'])
        let height = width / (dimensions['0'] / dimensions['1'])
        let sendData = {
          img,
          delay: 2000,
          width,
          height
        }
        const response = await fetch('https://audiobot.dweet.net/imgToAscii.php', {
          method: 'post',
          body: JSON.stringify(sendData),
          headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        //console.log(data)
        if(data[0]){
          //console.log(data[1])
          makeShortLink(data[1], chan, " <- ascii")
        }else{
          //console.log('fail'+"\n")
        }
      }
    })
  })
}

function queueTrack(searchString, chan, nickname){
  let command
  exec(command = 'curl -s \'https://audiobot.dweet.net/autoSearch.php?sparam=' + fixedEncodeURIComponent(searchString.replaceAll("'", '')) + "'", (error, stdout, stderr)=>{
    if (error) {
      console.log('error')
      console.log(command)
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log('stderror')
      console.log(command)
      console.log(`stderr: ${stderr}`)
      return
    }
    if(stdout){
      console.log(command)
      let res = JSON.parse(stdout)
      if(res[0]){
        let send = nickname + '\'s request is queued... (ETA ' + (Math.round(Math.random()*1000)/1000) + ' minutes ⏳)'
        serverRaw('PRIVMSG ' + chan + ' :' + send + "\r\n")
        addTrackByYTID(res[1], chan)
      }else{
        let send = 'hrm... something went wonky :('
        serverRaw('PRIVMSG ' + chan + ' :' + send + "\r\n")
      }
    }
  })
}


var queue = ''
function queueShortLink(url, chan, extraText){

  exec('curl -s \'https://shorty.dweet.net/shorty.php?' + (url.split(':http').join('http'))+"'", (error, stdout, stderr)=>{
    if (error) {
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`)
      return
    }
    if(stdout){
      let shortLink = 'https://shorty.dweet.net/' + stdout.split("\n")[0] + extraText
      let send = shortLink
                        queue = 'PRIVMSG ' + chan + ' :' + send + "\r\n"
    }
  })
}

function invokeQueue(url, chan, extraText){
  if(queue) serverRaw(queue)
        queue=''
}

function makeShortLink(url, chan, extraText){
  var command
  exec(command = "curl -s 'https://shorty.dweet.net/shorty.php?" + (url.split(':http').join('http'))+"'", (error, stdout, stderr)=>{
    if (error) {
      console.log('error')
      console.log(command)
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log('std error')
      console.log('command: ' + command)
      console.log(`stderr: ${stderr}`)
      return
    }
    if(stdout){
      console.log(command)
      let shortLink = 'https://shorty.dweet.net/' + stdout.split("\n")[0] + extraText
      let send = shortLink
      serverRaw('PRIVMSG ' + chan + ' :' + send + "\r\n")
    }
  })
}

function makeDemoLink(code, chan, extraText){
  var command
  exec(command = "cd /var/www/html/dweet.net/; php dweet.php '" + code.replaceAll("'", "`") + "'", (error, stdout, stderr)=>{
    if (error) {
      console.log('error')
      console.log(command)
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log('std error')
      console.log('command: ' + command)
      console.log(`stderr: ${stderr}`)
      return
    }
    if(stdout){
      console.log(command)
      let shortLink = 'https://dweet.net/' + stdout.split("\n")[0] + extraText
      let send = shortLink
      serverRaw('PRIVMSG ' + chan + ' :' + send + "\r\n")
    }
  })
}

function ƛ(details, _, Error) {
    State.auth = types_1.Some(details);
    State.error = types_1.Some(Error);
}
exports.ƛ = ƛ;
function Connect(port) {
    State.port = types_1.Some(port);
    return function () {
        var execution = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            execution[_i] = arguments[_i];
        }
        try {
            Irc.connect(State).then(function (state) {
                types_1.match(State.connection, function (client) {
                    client.on('data', function async (data) {
                        State.line = types_1.Some(data.toString().split(/\r\n/)[0]);
                        var d=data.toString()
                        console.log(d)
                        fullLine = d
                        if(d.indexOf('PING :')!==-1){
                          var key = d.substring(d.indexOf('PING :') + 6)
                          console.log('received PING... replying with PONG ' + key + "\n")
                          var response = 'PONG :' + key + "\r\n"
                          console.log('response: ' + response + "\n")
                          serverRaw(response)
                          var response = 'PONG ' +"\r\n"
                          console.log('response: ' + response + "\n")
                          serverRaw(response)
                        }
                        if(d.indexOf('MOTD ')!==-1) {
                          setTimeout(function(){
                            if(!joined){
                              joined = true
                              serverRaw('PRIVMSG nickserv :identify nodie code57253' + "\r\n")
                              process.argv.map((v, i)=>{
                                setTimeout(function(){
                                  if(i > 3){
                                    chans = [...chans, v]
                                    serverRaw('JOIN ' + v + "\r\n")
                                    //serverRaw('PRIVMSG ' + v + ' :moo!' + "\r\n")
                                  }
                                }, 2000*(i+1))
                              })
                            }
                          }, 1000)
                        } else {
                          chans.map((q,j)=>{
                            let chan = q
                            let token = 'PRIVMSG ' + chan + ' :'
                            if(d.indexOf(token)!==-1){

                              var message = data.toString().match(/PRIVMSG \#\S+ :(.+)/);
                              if (message) {
                                message.input.split("\r\n").forEach(async (msg) =>{
                                  let chatter = msg.split(':')[1]
                                  if(chatter) chatter=chatter.split('!')[0]
                                  if(!msg) return
                                  if(!msg.split(':').length || (msg.split(':').length>1 && msg.split(':')[1].split('!')[0].indexOf('audiobot')!==-1)) return
                                  let txtmsg = message[1]
                                  let dotCommand = txtmsg.indexOf('.') == 0 ? txtmsg.toLowerCase().split('.')[1].split(' ')[0] : ''
                                  let l=false


                                  if(
                                    dotCommand == 'wavevid' ||
                                    dotCommand == 'wavepic' ||
                                    dotCommand == 'wordle' ||
                                    dotCommand == 'matrix' ||
                                    dotCommand == 'wavey' ||
                                    dotCommand == 'twirl' ||
                                    dotCommand == 'scramble' ||
                                    dotCommand == 'ascii' ||
                                    dotCommand == 'demo' ||
                                    dotCommand == 'hint' ||
                                    dotCommand == 'd' ||
                                    dotCommand == 'play' ||
                                    dotCommand == 'superimpose' ||
                                    dotCommand == 'emphasize' ||
                                    dotCommand == 'last' ||
                                    dotCommand == 'cowsay' ||
                                    dotCommand == 'scanlines' ||
                                    dotCommand == 'efx' ||
                                    dotCommand == 'vignette'){
                                    let turl = txtmsg.split(' ').length && txtmsg.split(' '). length > 1 ? txtmsg.split(' ')[1] : ''
                                    switch(dotCommand){
                                      case 'wordle':
                                        let params = txtmsg.toLowerCase().split(' ').filter(v=>v)
                                        let knownLetters = params[1]
                                        let placement = params[2]
                                        return
                                      break
                                      case 'cowsay':
                                        cowsay(txtmsg, chan)
                                        return
                                      break
                                      case 'wavevid':
                                        makeShortLink('https://efx.dweet.net/' + turl + (txtmsg.indexOf('?')==-1 ? '?' : '&') + 'wavey', chan, " <- wavy version :D")
                                        return
                                      break
                                      case 'superimpose':
                                        makeShortLink('https://superimpose.dweet.net/' + turl, chan, " <- superimposed :D")
                                        return
                                      break
                                      case 'wavey':
                                        makeShortLink('https://efx.dweet.net/' + turl + (txtmsg.indexOf('?')==-1 ? '?' : '&') + 'wavey', chan, " <- wavy version :D")
                                        return
                                      break
                                      case 'scramble':
                                        wordmash(txtmsg, chan, chatter) 
                                        return
                                      break
                                      case 'hint':
                                        wordmash('.scramble hint', chan, chatter)
                                        return
                                      break
                                      case 'wavepic':
                                        makeShortLink('https://efx.dweet.net/' + turl + (txtmsg.indexOf('?')==-1 ? '?' : '&') + 'wavey', chan, " <- wavy version :D")
                                        return
                                      break
                                      case 'vignette':
                                        makeShortLink('https://efx.dweet.net/' + turl + (txtmsg.indexOf('?')==-1 ? '?' : '&') + 'vignette', chan, " <- vignette")
                                        return
                                      break
                                      case 'emphasize':
                                        makeShortLink('https://emphasis.dweet.net/' +  fixedEncodeURIComponent(txtmsg.substring(11).substr(0, 250).replaceAll("'", "")), chan, " <- emphasis :D")
                                        return
                                      break
                                      case 'play':
                                        queueTrack(txtmsg.substring(3), chan, chatter)
                                        return
                                      break
                                      case 'd':
                                        makeDemoLink(txtmsg.substring(3), chan, " <- demo")
                                        return
                                      break
                                      case 'demo':
                                        makeDemoLink(txtmsg.substring(6), chan, " <- demo")
                                        return
                                      break
                                      case 'ascii':
                                        //makeShortLink('https://ascii.dweet.net/' + turl, chan, " <- ascii")
                                        imgToAscii(turl, chan)
                                        return
                                      break
                                      case 'scanlines':
                                        makeShortLink('https://efx.dweet.net/' + turl + (txtmsg.indexOf('?')==-1 ? '?' : '&') + 'scanlines', chan, " <- scanlines")
                                        return
                                      break
                                      case 'matrix':
                                        makeShortLink('https://efx.dweet.net/' + turl + (txtmsg.indexOf('?')==-1 ? '?' : '&') + 'matrix', chan, " <- matrix")
                                        return
                                      break
                                      case 'twirl':
                                        makeShortLink('https://efx.dweet.net/' + turl + (txtmsg.indexOf('?')==-1 ? '?' : '&') + 'twirl', chan, " <- twirl")
                                        return
                                      break
                                      case 'last':
                                        invokeQueue()
                                        return
                                      break
                                      case 'efx':
                                        makeShortLink('https://efx.dweet.net/' + turl, chan, " <- efx")
                                        return
                                      break
                                    }
                                  } else { // auto stuff
                                    msg.split(' ').map((v,i)=>{
                                      if(v.indexOf('https://wavepic')==-1 && v.indexOf('https://efx')==-1 && v.toLowerCase().indexOf('https://')!== -1 && (v.toLowerCase().indexOf('.jpg')!==-1 || v.toLowerCase().indexOf('.png')!==-1 || v.toLowerCase().indexOf('.gif')!==-1 || v.toLowerCase().indexOf('/preview')!==-1 || v.toLowerCase().indexOf('.webm')!==-1 || v.toLowerCase().indexOf('.mp4')!==-1)){
                                        //console.log('https://efx.dweet.net/' + v + '?wavey', chan, " <- wavy version :D")
                                        queueShortLink('https://efx.dweet.net/' + v + '?wavey', chan, " <- wavy version :D")
                                        return
                                      }
                                    })
                                  }


                                  if((msg.toLowerCase()).indexOf(l='https://www.youtube.com')!==-1
                                    //|| (msg.toLowerCase().indexOf(l='https://music.youtube')!==-1
                                    || (msg.toLowerCase().indexOf(l='https://youtu.be')!==-1
                                    )){

                                      let sendData = {playlist: chan.split('').filter(v=>v!=='#').join('')}
                                      const response = await fetch('https://audiobot.dweet.net/create.php', {
                                        method: 'post',
                                        body: JSON.stringify(sendData),
                                        headers: {'Content-Type': 'application/json'}
                                      });
                                      const data = await response.json();
                                      if(data[0]){
                                        let link = ((msg.substring(msg.indexOf(l)).trim())).split(' ')[0]

                                        l=''
                                        //serverRaw('PRIVMSG ' + channel + ' :' + link + "\r\n")
                                        if((l=link.split('?')).length){
                                          l=l.filter(v=>v.indexOf('v=')!==-1)
                                          if(l.length) l=l[l.length-1].split('v=')[1].split('&')[0]
                                        }
                                        if(!l || !l[0]){
                                          l=link.split('/')
                                          l=l[l.length-1]
                                        }
                                        let videoID = l
                                        //serverRaw('PRIVMSG ' + channel + ' :' + videoID.length + "\r\n")

                                        if(videoID.length >= 8 && videoID.length <=15){
                                          addTrackByYTID(videoID, chan)
                                        }
                                      }
                                    }
                                })
                              }
                            }
                          })
                        }
                        var message = data.toString().match(/PRIVMSG \#\S+ :(.+)/);
                        if (message) {
                          State.message = types_1.Some(message[1].trim());
                        }
                        applyMany(State, execution);
                    });
                }, function (_) {
                    throw new ReferenceError('Failed to connect');
                });
            });
        }
        catch (e) {
            types_1.match(State.error, function (call) { return call(); }, function (_) {
                console.error('Uh oh ⚡️', e);
            });
        }
    };
}
exports.Connect = Connect;
function server(prefix, response) {
    return types_1.match(State.connection, function (connection) {
        return connection.write(prefix[0] + " :" + response + "\r\n");
    }, function (_) { return false; });
}
exports.server = server;
function serverRaw(response) {
    return types_1.match(State.connection, function (connection) {
        return connection.write(response + "\r\n");
    }, function (_) { return false; });
}
exports.server = serverRaw
function reply(response, data, chan) {
    return types_1.match(State.connection, function (connection) {
        var where = types_1.match(State.auth, function (credentials) { return credentials.channel; }, function () { return '##dslbottesting'; });
        return connection.write("PRIVMSG " + chan + " :" + (data || response) + "\r\n");
    }, function (_) { return false; });
}
exports.reply = reply;
function message(what) {
  //chans.map((v,i)=>{
  //  let chan = v
  //  let token = 'PRIVMSG ' + chan + ' :'
  //  if(line.indexOf(token)!==-1){
      return function (callback) {
          types_1.match(State.message, function (line) {
              if (what.test(line)) {
                  var capture = what.exec(line);
                  chans.map((v,i)=>{
                    let chan = v
                    let token = 'PRIVMSG ' + chan + ' :'
                    if(fullLine.indexOf(token)!==-1){
                      callback(capture ? capture[1] : line.split(/:/)[2], chan);
                      State.message = types_1.None;
                    }
                 })
              }
          }, function (_) { return false; });
      };
  //})
}
exports.message = message;
function on(what) {
    return function (callback) {
        types_1.match(State.line, function (line) {
              if (what.test(line)) {
                  var capture = what.exec(line);
                  callback(capture ? capture[1] : line.split(/:/)[2]);
              }
        }, function (_) {
            throw new ReferenceError('Connection not established');
        });
    };
}
exports.on = on;


