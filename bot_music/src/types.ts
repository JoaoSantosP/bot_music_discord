import { AudioPlayer, AudioResource, VoiceConnection } from "@discordjs/voice"
import { SoundCloudStream, YouTubeStream, YouTubeVideo } from "play-dl"

export type songType = {
  videoInfo: YouTubeVideo,
  fileStream: YouTubeStream | SoundCloudStream
}

export type serverType = {
  connection: VoiceConnection | null,
  dispatcher: AudioResource | null,
  queue: songType[],
  audioPlayer: AudioPlayer | null

}

export type youtubeApiType = {
  version: string,
  auth: string | undefined
}

export type resourceCreatedType = {
  resource: AudioResource<unknown>
  song: songType | undefined
}

export type urlType = {
  url: string,
  videosInfo: {
    title: string,
    videoId: string,
    channelId: string
  }
}

