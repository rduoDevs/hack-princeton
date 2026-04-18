import { io, Socket } from 'socket.io-client'

const socket: Socket = io('http://localhost:3003', {
  autoConnect: false,
  transports: ['websocket'],
})

export default socket
