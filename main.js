let APP_ID = "65c43886af5a493ab6f31c70baa5d07a"


let token = null
let uid = String(Math.floor(Math.random() * 10000))

let client;
let channel;

let queryString = window.location.search
let url = new URLSearchParams(queryString)
let roomId = url.get('room')

if(!roomId){
    window.location = 'lobby.html'
}

let localStream;
let remoteStream;
let peerConnection;


const servers = {
    iceServers:[
        {
            urls: ['stun:stun1.1.google.com:19302', 'stun:stun2.1.google.com:19302']
        }
    ]
}

let constraints = {
    video: {
        width:{min:60, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1920},
    },

    audio:true
}

let init = async() => {

    client = await AgoraRTM.createInstance(APP_ID)
    console.log(client)
    await client.login({uid, token})

    // index.html?room=234458
    channel = client.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)


    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    document.getElementById('user-1').srcObject = localStream

}

let handleUserLeft = async (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handleMessageFromPeer = async (message, MemberId) => {

    message = JSON.parse(message.text)

    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}


let handleUserJoined = async (memberId) => {
    console.log('A new user has join:', memberId)
    createOffer(memberId)
}

let createPeerConnection = async (memberId) =>{
  peerConnection = new RTCPeerConnection(servers)

  remoteStream = new MediaStream()
  document.getElementById('user-2').srcObject = remoteStream
  document.getElementById('user-2').style.display = 'block'


  document.getElementById('user-1').classList.add('smallFrame') 
  
  if(!localStream){
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false})
    document.getElementById('user-1').srcObject = localStream
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream)
  })

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track)
    })
  }

  peerConnection.onicecandidate = async (event) => {
    if(event.candidate){
        client.sendMessageToPeer({text: JSON.stringify({'type': 'candidate', 'candidate': event.candidate})}, memberId)

    }
  }

}

let createOffer = async (memberId) => {
  await createPeerConnection(memberId)
  let offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)

  client.sendMessageToPeer({text: JSON.stringify({'type': 'offer', 'offer': offer})}, memberId)
}

let createAnswer = async(memberId, offer) =>{
    await createPeerConnection(memberId)
    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    client.sendMessageToPeer({text: JSON.stringify({'type': 'answer', 'answer': answer})}, memberId)

}

let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leavechannel = async () => {
    await channel.leave()
    await client.logout()
}

let toggleCamera = async () => {
    let audioTrack = localStream.getTracks().find((track) => track.kind === 'video')

    if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('camera-btn').style.background = 'rgb(255, 80, 80)'
    }

    else{
        audioTrack.enabled = true
        document.getElementById('camera-btn').style.background = 'rgb(179, 102, 249, .9)'
    }
}


let toggleMic = async () => {
    let audioTrack = localStream.getTracks().find((track) => track.kind === 'audio')

    if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.background = 'rgb(255, 80, 80)'
    }

    else{
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.background = 'rgb(179, 102, 249, .9)'
    }
}
window.addEventListener('beforeunload', leavechannel)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)

init()