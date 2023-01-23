
export function createQueue(song: any, serverId: any, connections: any) {
  if (connections[serverId]) {
    const queue = connections[serverId]
    queue.push(song)
    connections[serverId] = queue
  } else {
    connections[serverId] = [song]
  }
  return connections
}

export function createServersControllers(connectionServer: any, serverId: any, connection: any, resource: any | null) {
  connectionServer[serverId] = {
    connection: connection,
    dispatcher: resource
  }

  return connectionServer
}

export function serverPlayers(serversPlayers: any, serverId: any, player: any) {
  /* serversPlayers[serverId] = {
    player: player
  } */
  if (!serversPlayers[serverId]) {
    serversPlayers[serverId] = {
      player: player
    }
  }
  return serversPlayers
}