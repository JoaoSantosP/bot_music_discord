
import { AudioPlayerStatus, joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior, createAudioResource, VoiceConnectionStatus, VoiceConnectionDisconnectReason, AudioPlayer, entersState } from '@discordjs/voice';

import * as Discord from 'discord.js';



import { GatewayIntentBits, Events, ChannelType, Message } from 'discord.js';


import { validateURL, validateID } from 'ytdl-core';

import playdl, { SoundCloudStream, YouTubeStream, YouTubeVideo } from 'play-dl';

// import { Params$Resource$Search$List } from 'googleapis';
import { createQueue, createServersControllers, serverPlayers } from './outros';
import * as googleApi from 'googleapis';

type youtubeAPi = {
  version: string,
  auth: string | undefined
}

const dotenv = require('dotenv').config()

const authenticate: youtubeAPi = {
  version: 'v3',
  auth: process.env.GOOGLE_KEY
}

const youtube: any = new googleApi.youtube_v3.Youtube(authenticate)

/* const connectionServer: any = {
  servidor: {
    connection: null,
    dispatcher: null
  }
} */

let connectionsServers: any = {}

let serversPlayers: any = {}

let serverPlayer: any
//////////////////////////////////
type serverQueue = {
  guildId?: Array<song> | []
}
const connections: serverQueue = {}

const client: Discord.Client = new Discord.Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] })

const prefix = '!'

let serverId: any
let queueServers: any
let servidores: any

let uniqueConnection: any

let player: any

client.on(Events.ClientReady, () => {
  console.log('bot is ready!')
  /* */
})
type song = {
  videoInfo: YouTubeVideo,
  fileStream: YouTubeStream | SoundCloudStream
}
// let queueSongs: song[] = [];

client.on(Events.MessageCreate, async (msg: Message) => {
  if (msg.author.bot) return;
  if (msg.channel.type === ChannelType.DM) return;

  if (!msg.content.toLowerCase().startsWith(prefix)) return;

  const args = msg.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  const channel = msg.member?.voice.channel;

  if (command?.length === 0) {
    msg.reply('Type a command!');
    return;
  }
  if (!channel) {
    return msg.reply('Conecte-se a um canal de voz')
  }
  if (command === 'play') {
    const arg = args.join().replace(',', ' ')

    let urlCreated: any = (await createURL(arg))

    let urlIsValid
    if (urlCreated.url !== '') {
      urlIsValid = validateURL(urlCreated.url)
    } else {
      urlIsValid = validateURL(arg)
      urlCreated = { url: arg }
    }

    if (!urlIsValid) {
      msg.reply(`<${arg}>  is not URL valid!`);
      return;
    }
    let videoInfo
    let fileStream
    videoInfo = await playdl.search(urlCreated.url)
    fileStream = await playdl.stream(urlCreated.url)

    uniqueConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });
    const song: song = { videoInfo: videoInfo[0], fileStream }

    serverId = msg.guild?.id

    servidores = createServersControllers(connectionsServers, serverId, uniqueConnection, null)

    queueServers = createQueue(song, serverId, connections)

    player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    })
    serverPlayer = serverPlayers(serversPlayers, serverId, player)

    if (serverPlayer[serverId].player.state.status !== AudioPlayerStatus.Idle) {
      msg.reply(`A música ${videoInfo[0].title} foi adicionada na fila`)
      return
    }
    if (queueServers[serverId].length > 0) {
      if (serverPlayer[serverId].player.state.status === AudioPlayerStatus.Idle) {
        let resource: any = createResource(queueServers[serverId], serverId)

        serverPlayer[serverId].player.on('stateChange', async (o: any, n: any) => {

          if (n.status === AudioPlayerStatus.Idle && o.status !== AudioPlayerStatus.Idle && queueServers[serverId].length !== 0) {
            resource = createResource(queueServers[serverId], serverId)

            msg.channel.send({ embeds: [createEmbed(urlCreated.videoInfos, msg, resource.song)] })

            return serverPlayer[serverId].player.play(resource.resource)
          }
          if (n.status === AudioPlayerStatus.Idle && o.status !== AudioPlayerStatus.Idle && queueServers[serverId].length === 0) {
            try {
              await entersState(serverPlayer[serverId].player, AudioPlayerStatus.Playing, 40_000)
              return serverPlayer
            } catch (error) {
              return servidores[serverId].connection.disconnect()
            }
          }
        })

        serverPlayer[serverId].player.play(resource.resource)
        servidores[serverId].connection.subscribe(serverPlayer[serverId].player)
        msg.channel.send({ embeds: [createEmbed(urlCreated.videoInfos, msg, resource.song)] })
        return servidores
      }
    }
    else {
      msg.reply('Queue song  is empty')
      return;
    }

  } else if (command === 'skip') {
    if (queueServers[serverId].length === 0 && serverPlayer[serverId].player.state.status === 'playing') {
      msg.reply('não tem musicas na fila')
      return
    }
    const resource = createResource(queueServers[serverId], serverId)
    return serverPlayer[serverId].player.play(resource.resource)
  } else if (command === 'leave') {
    queueServers[serverId] = []
    serverPlayer[serverId].player.state.status = AudioPlayerStatus.Idle
    return servidores[serverId].connection.disconnect()
  } else if (command === 'stop') {
    return servidores[serverId].dispatcher.audioPlayer.pause()
  } else if (command === 'resume') {
    return servidores[serverId].dispatcher.audioPlayer.unpause()
  }
  else {
    msg.reply('Type a valid command')
    return;
  }


})

/* client.on(Events.VoiceStateUpdate, async (vs) => {
  const voiceConnection = await connectionsServers[serverId]


  if (!voiceConnection.connection && !vs.member?.user.bot) {
    return
  }
  voiceConnection.connection.on('stateChange', async (_oldState: any, newState: any) => {
    if (newState.status === VoiceConnectionStatus.Disconnected) {
      if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
        serverPlayer[serverId].player.stop()
        serverPlayer[serverId].player.state.status = AudioPlayerStatus.Idle
        return voiceConnection.dispatcher.ended = true
      }
    }
  })
}) */


client.login(process.env.TOKEN)

/* function createResource(songsInfo: any, serverId: any) {
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
  servidores[serverId].dispatcher = resource
  return { resource, song }
} */

function createResource(songsInfo: any, serverId: any) {
  let song = songsInfo.shift()
  const resource = createAudioResource(song.fileStream.stream, { inputType: song.fileStream.type });
  servidores[serverId].dispatcher = resource
  return { resource, song }
}

async function createURL(msg: string) {
  let url = 'https://www.youtube.com/watch?v='
  const req: any = {
    q: msg,
    part: 'snippet',
    type: 'video'
  }
  try {
    const videoInfos = await youtube.search.list(req).then((r: any) => {

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



function createEmbed(videoInfo: any, msg: any, song: any) {
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

/*  videoInfo = await playdl.video_info(urlCreated.videoId)
 if (!videoInfo) { */
/* const isCorrectSong = urlCreated.videoInfos.title.toLowerCase().includes(args[0].toLowerCase())
console.log(urlCreated.videoInfos.title, 'title')
if (!isCorrectSong) {

  msg.reply('Musica não encontrada, digite novamente')
  return
} else { */
// }
/* }
fileStream = await playdl.stream_from_info(videoInfo) */