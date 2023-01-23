import { AudioPlayerStatus, joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior, createAudioResource, entersState, AudioResource, VoiceConnectionDisconnectReason, VoiceConnectionStatus } from '@discordjs/voice';

import * as Discord from 'discord.js';

import { GatewayIntentBits, Events, ChannelType, Message, Guild, VoiceState } from 'discord.js';

import { validateURL } from 'ytdl-core';

import playdl from 'play-dl';

import { youtubeApiType, serverType, songType, resourceCreatedType, urlType } from './types';
import * as googleApi from 'googleapis';

import * as fs from 'fs'

import * as path from 'path'

const dotenv = require('dotenv').config()

const authenticate: youtubeApiType = {
  version: 'v3',
  auth: process.env.GOOGLE_KEY
}

const youtube: googleApi.youtube_v3.Youtube = new googleApi.youtube_v3.Youtube(authenticate)

const servers: Array<serverType> = []


const client: Discord.Client = new Discord.Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] })

const prefix = '!'

client.on(Events.GuildCreate, (guild: Guild) => {
  const guildId: any | string = guild.id
  servers[guildId] = {
    connection: null,
    dispatcher: null,
    queue: [],
    audioPlayer: createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    })
  }
  saveServer(guildId)
})
client.on(Events.ClientReady, () => {
  loadServers()
  console.log('bot is ready!')
})

client.on(Events.MessageCreate, async (msg: Message): Promise<any> => {

  const serverId: string | any = msg.guild?.id
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
    const arg: string = args.join().replace(',', ' ')

    let urlCreated: any = (await createURL(arg))
    let urlIsValid
    if (urlCreated.url !== '') {
      urlIsValid = validateURL(urlCreated.url)
    } else {
      urlIsValid = validateURL(arg)

      urlCreated.url = arg
    }

    if (!urlIsValid) {
      msg.reply(`<${arg}>  is not URL valid!`);
      return;
    }
    let videoInfo
    let fileStream
    videoInfo = await playdl.search(urlCreated.url)
    fileStream = await playdl.stream(urlCreated.url)



    servers[serverId].connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });
    const song: songType = { videoInfo: videoInfo[0], fileStream }

    servers[serverId].queue.push(song)

    servers[serverId].connection!.on('stateChange', async (_oldState: any, newState: any) => {
      if (servers[serverId].connection!.state.status === VoiceConnectionStatus.Disconnected) {
        if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
          servers[serverId].audioPlayer!.stop()
          servers[serverId].audioPlayer!.state.status = AudioPlayerStatus.Idle
          servers[serverId].queue = []
        }
      }
    })
    if (servers[serverId].audioPlayer?.state.status !== AudioPlayerStatus.Idle) {
      msg.reply(`A música ${videoInfo[0].title} foi adicionada na fila`)
      return
    }
    if (servers[serverId].queue.length > 0) {
      if (servers[serverId].audioPlayer?.state.status === AudioPlayerStatus.Idle) {
        const resource: resourceCreatedType = createResource(servers[serverId].queue, serverId)

        servers[serverId].audioPlayer?.on('stateChange', async (o: any, n: any) => {

          if (n.status === AudioPlayerStatus.Idle && o.status !== AudioPlayerStatus.Idle && servers[serverId].queue.length !== 0) {

            const resource: resourceCreatedType = createResource(servers[serverId].queue, serverId)

            msg.channel.send({ embeds: [createEmbed(urlCreated.videoInfos, msg, resource.song)] })

            return servers[serverId].audioPlayer?.play(resource.resource)
          }
          if (n.status === AudioPlayerStatus.Idle && o.status !== AudioPlayerStatus.Idle && servers[serverId].queue.length === 0) {
            try {
              await entersState(servers[serverId].audioPlayer!, AudioPlayerStatus.Playing, 40_000)
              return servers[serverId]
            } catch (error) {
              return servers[serverId].connection?.disconnect()
            }
          }
        })

        servers[serverId].audioPlayer?.play(resource.resource)
        servers[serverId].connection?.subscribe(servers[serverId].audioPlayer!)
        msg.channel.send({ embeds: [createEmbed(urlCreated.videoInfos, msg, resource.song)] })
        return servers[serverId]
      }
    }
    else {
      msg.reply('Queue song  is empty')
      return;
    }

  }
  else if (command === 'skip') {
    if (servers[serverId].queue.length === 0 && servers[serverId].audioPlayer!.state.status === 'playing') {
      msg.reply('não tem musicas na fila')
      return
    }
    const resource = createResource(servers[serverId].queue, serverId)
    return servers[serverId].audioPlayer?.play(resource.resource)
  }
  else if (command === 'leave') {
    servers[serverId].queue = []
    servers[serverId].audioPlayer!.state.status = AudioPlayerStatus.Idle
    return servers[serverId].connection?.disconnect()
  }
  else if (command === 'stop') {
    return servers[serverId].dispatcher!.audioPlayer!.pause()
  }
  else if (command === 'resume') {
    return servers[serverId].dispatcher?.audioPlayer?.unpause()
  }
  else {
    msg.reply('Type a valid command')
    return;
  }

})


client.login(process.env.TOKEN)


function createResource(songsInfo: songType[], serverId: string | any) {
  let song: songType | undefined = songsInfo.shift()
  const resource: AudioResource = createAudioResource(song!.fileStream.stream, { inputType: song!.fileStream.type });
  servers[serverId].dispatcher = resource
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

  return embedNewResource
}

function loadServers() {
  const pathServers = path.join(__dirname, '..', 'server.json')
  fs.readFile(pathServers, 'utf-8', (err: NodeJS.ErrnoException | null, data: string) => {
    if (err) {
      console.log(err, 'console.log')
      throw err
    }
    const serversLoaded = JSON.parse(data)
    for (const guildId of serversLoaded.servers) {
      if (!servers[guildId]) {
        servers[guildId] = {
          connection: null,
          dispatcher: null,
          queue: [],
          audioPlayer: createAudioPlayer({
            behaviors: {
              noSubscriber: NoSubscriberBehavior.Pause
            }
          })
        }
      }
    }
  })
}

function saveServer(guildId: string | any) {
  const pathServers = path.join(__dirname, 'server.json')
  fs.readFile(pathServers, 'utf-8', (err: NodeJS.ErrnoException | null, data: string) => {
    if (err) {
      console.log(err, 'console.log')
      throw err
    }
    const serversLoaded = JSON.parse(data)
    serversLoaded.servers.push(guildId)
    const jsonFyServers = JSON.stringify(serversLoaded)
    fs.writeFile(pathServers, jsonFyServers, 'utf-8', () => { })
  })














  /* client.on(Events.VoiceStateUpdate, async (voiceState: VoiceState) => {
    const serverId: string | any = voiceState.guild.id
    const voiceConnectionServer: serverType = servers[serverId]
    console.log('state update')
  
    if (!voiceConnectionServer.connection && !voiceState.member?.user.bot) {
      return
    }
    voiceConnectionServer.connection!.on('stateChange', async (_oldState: any, newState: any) => {
      console.log('state change')
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
          voiceConnectionServer.audioPlayer!.stop()
          voiceConnectionServer.audioPlayer!.state.status = AudioPlayerStatus.Idle
          return voiceConnectionServer.queue = []
          // return (voiceConnectionServer.dispatcher!.ended as boolean) = true
        }
      }
    })
  }) */
}