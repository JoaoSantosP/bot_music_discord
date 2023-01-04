
const { AudioPlayerStatus, joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior, createAudioResource, VoiceConnectionStatus, VoiceConnectionDisconnectReason } = require('@discordjs/voice');

const Discord = require('discord.js');



const { GatewayIntentBits, Events, ChannelType } = require('discord.js')


const { validateURL, validateID } = require('ytdl-core')

const playdl = require('play-dl')



const googleApi = require('googleapis');



const dotenv = require('dotenv').config()

const youtube = new googleApi.youtube_v3.Youtube({
  version: 'v3',
  auth: process.env.GOOGLE_KEY
})

const connectionServer = {
  servidor: {
    connection: null,
    dispatcher: null
  }
}

const client = new Discord.Client({ autoReconnect: true, retryLimit: Infinity, intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] })

const prefix = '!'



const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause
  }
});

client.on(Events.ClientReady, () => {
  console.log('bot is ready!')
  /* */
})
let queueSongs = [];

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;
  if (msg.channel.type === ChannelType.DM) return;

  if (!msg.content.toLowerCase().startsWith(prefix)) return;

  const args = msg.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  const channel = msg.member.voice.channel;


  if (command.length === 0) {
    msg.reply('Type a command!');
    return;
  }


  if (command === 'play') {
    const arg = args.join().replace(',', ' ')
    console.log(arg);
    let urlCreated = (await createURL(arg))

    let urlIsValid
    if (urlCreated.url !== '') {
      urlIsValid = validateURL(urlCreated.url)
    } else {
      urlIsValid = validateURL(arg)
      urlCreated = { url: arg }
    }
    /* let videoInfo
    let fileStream */
    console.log(arg)
    if (!urlIsValid) {
      msg.reply(`<${arg}>  is not URL valid!`);
      return;
    }

    /*  videoInfo = await playdl.video_info(urlCreated.videoId)
     if (!videoInfo) { */
    let videoInfo
    let fileStream
    /* const isCorrectSong = urlCreated.videoInfos.title.toLowerCase().includes(args[0].toLowerCase())
    console.log(urlCreated.videoInfos.title, 'title')
    if (!isCorrectSong) {

      msg.reply('Musica não encontrada, digite novamente')
      return
    } else { */
    videoInfo = await playdl.search(urlCreated.url)
    fileStream = await playdl.stream(urlCreated.url)
    // }
    /* }
    fileStream = await playdl.stream_from_info(videoInfo) */

    connectionServer.servidor.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });
    queueSongs.push({ videoInfo: videoInfo[0], fileStream })

    if (player.state.status !== AudioPlayerStatus.Idle) {
      msg.reply(`A música ${videoInfo[0].title} foi adicionada na fila`)
      return
    }
    if (queueSongs.length > 0) {
      if (player.state.status === AudioPlayerStatus.Idle) {
        let resource = createResource(queueSongs)

        player.on('stateChange', (o, n) => {
          if (n.status === AudioPlayerStatus.Idle && o.status !== AudioPlayerStatus.Idle && queueSongs.length !== 0) {

            resource = createResource(queueSongs)

            msg.channel.send({ embeds: [createEmbed(urlCreated.videoInfos, msg, resource.song)] })
            // msg.reply()
            return player.play(resource.resource)
          }
        })

        player.play(resource.resource)
        connectionServer.servidor.connection.subscribe(player)
        msg.channel.send({ embeds: [createEmbed(urlCreated.videoInfos, msg, resource.song)] })
        return connectionServer.servidor
      }
    }
    else {
      msg.reply('Queue song  is empty')
      return;
    }

  } else if (command === 'skip') {
    if (queueSongs.length === 0 && player.state.status === 'playing') {
      msg.reply('não tem musicas na fila')
      return
    }
    const resource = createResource(queueSongs)
    return player.play(resource.resource)
  } else if (command === 'leave') {
    queueSongs = []
    player.state.status = AudioPlayerStatus.Idle
    return connectionServer.servidor.connection.disconnect()
  } else if (command === 'stop') {
    return connectionServer.servidor.dispatcher.audioPlayer.pause()
  } else if (command === 'resume') {
    return connectionServer.servidor.dispatcher.audioPlayer.unpause()
  }
  else {
    msg.reply('Type a valid command')
    return;
  }


})

client.on(Events.VoiceStateUpdate, async (vs) => {
  const voiceConnection = connectionServer.servidor.connection
  if (!voiceConnection) {
    return
  }
  voiceConnection.on('stateChange', async (_oldState, newState) => {
    if (newState.status === VoiceConnectionStatus.Disconnected) {
      if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
        player.stop()
        player.state.status = AudioPlayerStatus.Idle
        return connectionServer.servidor.dispatcher.ended = true
      }
    }
  })
})


client.login(process.env.TOKEN)

function createResource(songsInfo) {
  let song
  let index = 0

  while (index < songsInfo.length) {
    song = songsInfo[index]

    if (song.ended === false) {
      index += 0
    } else {
      index += 1
      songsInfo.shift()
    }
  }

  const resource = createAudioResource(song.fileStream.stream, { inputType: song.fileStream.type });
  connectionServer.servidor.dispatcher = resource
  return { resource, song }
}


async function createURL(msg) {
  let url = 'https://www.youtube.com/watch?v='
  try {
    const videoInfos = await youtube.search.list({
      q: msg,
      part: 'snippet',
      type: 'video'
    }).then((r) => {

      return {
        videoId: r.data.items[0].id.videoId,
        title: r.data.items[0].snippet.title,
        channelId: r.data.items[0].snippet.channelId
      }

    })
    url += videoInfos.videoId
    if (videoInfos) {
      return { url, videoInfos }
    }
  } catch (err) {
    console.log(err)
    return { url: '', videoInfos: { title: '', videoId: '', channelId: '' } }
  }
}

//

function createEmbed(videoInfo, msg, song) {
  const embedNewResource = new Discord.EmbedBuilder()
  // if (videoInfo.title === song.videoInfo.title) {}
  embedNewResource.setColor('Random')
  embedNewResource.setTitle(song.videoInfo.title)
  embedNewResource.addFields({
    name: 'Duration',
    value: song.videoInfo.durationRaw,
    inline: true
  }, {
    name: 'Requested by',
    value: msg.author.username,
    inline: true
  })
  embedNewResource.setThumbnail(song.videoInfo.thumbnails[0].url)
  /*   else {
     embedNewResource.setColor('Random')
       .setDescription('Sem informaçoes sobre a musica')
   } */
  return embedNewResource
}
