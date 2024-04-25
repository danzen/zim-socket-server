import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

var app = express()

const server = createServer(app)

 const io = new Server(server, {
     cors: {
         origin: "*" // this might work
     }
 });


// // UNCOMMENT to test the index.html page in the public directory at http://localhost:7010
// // read the top of the public/index.html page for more info
// app.use(express.static('public'))

app.set("port", process.env.PORT || 7010)


// ZIM SERVER (for ZIM Socket Module - http://zimjs.com/docs.html?item=Socket)

// ZIM Server with NodeJS and SocketIO
// based on RobinFlash Server in PHP by Dan Zen 2006
// updated to NodeJS by Andrew Blackbourn 2013
// programmed fresh with SocketIO by Dan Zen 2015 - free to use and change

// SocketIO handles apps, sockets and rooms
// the apps below are not really apps in the SocketIO sense
// but rather an appName prefix followed by the roomRoot and a number suffix
// appName_roomRoot0, appName_roomRoot1, appName_roomRoot2, etc.
// if no roomRoot is provided, then "default" is used
// the term roomRoot is used to avoid confusion with a room
// for example, test is the roomRoot of the room test2

// ZIM Server handles the maximum number of people in the room (0 is unlimited)
// and also handles how empty spots from people leaving get filled by the next to join
// these are the parameters sent in as a data object when a person joins
// it also handles changing rooms by changing the roomRoot
// it does not let you change rooms within a roomRoot

// JOIN AND LEAVE
// server sends out events to others when people join and leave

// DATA
// ZIM Server also handles receiving data and distributing data to people in the room
// the socket.id is used to key all this data
// the sender sends an object to the server and the server relays the object to the clients
// the clients then merge the object with a master object per client
// the server serves each new client with a current master object
// it is then up to the client to update the master object locally
// a sync command can be sent to request the master object from the server if desired

// HISTORY
// There is a history property for each room that can be appended to or cleared by people
// the history file is only sent when a new person joins
// this allows things like past chat histories to be sent to new clients

// LAST DATA
// Initially, we need to send who updated the properties last
// and who was the last person overall to update a property
// we send this to a new person in a room
// this is used in a variety of cases such as initially positioning a shared ball
// for regular data, the client is responsible for keeping track of the "last" data

// MASTER
// there is a master property for each room - socket.master will be true if the master
// there is a masterTime stamp based on the start of the server
// and a socket's joinTime for each time the socket enters a room
// and a currentTime is available by sending a time request

// PERSISTENT VARIABLES
// these will run as long as the server runs
// while the server runs, the apps are never cleared
// but the rooms inside an app may be cleared if all people have left the room for that app

var masterTime = Math.floor(Date.now() / 1000)
var apps = {} // apps["appName"] = {roomRoot:{maxPeople:3, fill:true, rooms:["roomName", "roomName"]}, roomRoot2:{ etc }}
var rooms = {}
// rooms["roomName"] = {
//	people:2, // current number
//  gone:1, // how many have left the room
//	history:"",
//	sockets:{id:socket, id2:socket},
//	current:{id:{x:10, y:20}, id2:{x:33, y:42}},
//	last:{id:id, properties:{text:[id,"hi"], y:[id,10]}
// }
var clients = {} // clients[socketID] = {app:appName, roomRoot:roomRoot, room:roomName}

console.log("preconnect")

// SOCKET IO CONNECTION

io.on("connection", function (socket) {

    console.log(socket.id + " connected")

    // socket gives us a reference to the socket that connects us to the client
    // this variable is available for us while the client is connected
    // socket.id gives us the unique id of the socket - like "fhSsasdfa4ULksjd5f"
    // we create a client object inside of the clients object for each socket based on the id
    // this will hold the app, the roomroot and the roomname
    // this data gets added when the client joins and then afterwards,
    // any events that come in like the message, history, disconnect, etc.
    // can get access to the socket's room and app objects like so:
    // rooms[clients[socket.id].room]
    // apps[clients[socket.id].app]

    // HANDLE NEW CLIENTS

    socket.on("join", function (data) {

        // if socket already exists - it is room change
        // remove them from the last room
        // add them to a new room - else add them to a new room (same way)

        if (clients[socket.id]) removeFromRoom()
        socket.emit("join", addToRoom(data))
        sendOutData(data.initObj, "join")

        function addToRoom(data) {
            // setting app and room names to lowercase no spaces

            var appName = data.appName // name	of app
            if (zot(appName)) appName = "default"
            appName = appName.toLowerCase()
            appName = appName.replace(/\n/, "")

            var roomRoot = data.roomName // name of room without index on end
            if (zot(roomRoot)) roomRoot = "default"
            roomRoot = roomRoot.toLowerCase()
            roomRoot = roomRoot.replace(/\n/, "")

            var app // object
            var room // object
            var roomName // name of room with index on end

            if (!apps[appName]) {
                app = { maxPeople: data.maxPeople, fill: data.fill, rooms: [] }
                apps[appName] = {}
                apps[appName][roomRoot] = app
            } else {
                if (!apps[appName][roomRoot]) {
                    app = { maxPeople: data.maxPeople, fill: data.fill, rooms: [] }
                    apps[appName][roomRoot] = app
                } else {
                    app = apps[appName][roomRoot]
                    // if these have changed, use current values
                    if (!zot(data.maxPeople)) app.maxPeople = data.maxPeople
                    if (!zot(data.fill)) app.fill = data.fill
                }
            }

            var filled = false
            if (app.fill) {
                for (var i = 0; i < app.rooms.length; i++) {
                    roomName = app.rooms[i]
                    room = rooms[roomName]
                    if (!room) continue // room may have been emptied
                    if (room.people < app.maxPeople) {
                        filled = true
                        break
                    }
                }
            }

            // if the app is set to fill - might still not be filled if no empty spots
            // or filled might be false because fill is false
            if (!filled) { // add to latest room
                if (app.rooms.length > 0) {
                    roomName = app.rooms[app.rooms.length - 1]
                    room = rooms[roomName] // this room may have been emptied
                    if (room && (app.maxPeople == 0 || room.people < app.maxPeople)) {
                        if (!app.fill && room.people + room.gone >= app.maxPeople) {
                            makeRoom()
                        }
                        // this is the room
                    } else {
                        makeRoom()
                    }
                } else {
                    makeRoom()
                }
            }

            function makeRoom() {
                roomName = appName + "_" + roomRoot + app.rooms.length
                room = { people: 0, gone: 0, history: "", sockets: {}, current: {} }
                app.rooms.push(roomName)
                rooms[roomName] = room
                room.last = { properties: {} }
            }

            function updateLast(id, obj) {
                //	last:{id:id, properties:{text:[id,"hi"], y:[id,10]}
                room.last.id = id
                for (var i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        room.last.properties[i] = [id, obj[i]]
                    }
                }
            }

            if (!data.initObj) data.initObj = {}
            data.initObj.id = socket.id
            updateLast(socket.id, data.initObj)
            room.people++
            room.sockets[socket.id] = socket

            socket.join(roomName)
            clients[socket.id] = { app: appName, roomRoot: roomRoot, room: roomName }

            var joinTime = Math.floor(Date.now() / 1000)
            return { id: socket.id, masterTime: masterTime, joinTime: joinTime, history: room.history, current: room.current, last: room.last }
        }
    })


    // HANDLE RECEIVING AND DISTRIBUTING PROPERTIES

    socket.on("message", function (data) {
        data.id = socket.id
        sendOutData(data, "message")
    })

    socket.on("time", function () {
        var currentTime = Math.floor(Date.now() / 1000)
        socket.emit("time", { masterTime: masterTime, currentTime: currentTime })
    })

    socket.on("sync", function () {
        if (!clients[socket.id]) return
        var roomName = clients[socket.id].room
        var room = rooms[roomName]
        if (!room) return
        var currentTime = Math.floor(Date.now() / 1000)
        function filter(obj) { // copy current object and remove current client
            var out = copy(obj)
            delete out[socket.id]
            return out
        }
        socket.emit("sync", { id: socket.id, masterTime: masterTime, currentTime: currentTime, history: room.history, current: filter(room.current), last: room.last })
    })

    function sendOutData(data, type) {
        // handles both a message send (for dispatching a data event)
        // and a join send (for dispatching an otherjoin event)
        // io.sockets.in(data.room).emit("receive", data); // to all

        if (!clients[socket.id]) return
        var roomName = clients[socket.id].room

        socket.broadcast.to(roomName).emit("receive", data, type) // not to self

        var room = rooms[roomName]
        if (!room) return
        room.current[socket.id] = merge(room.current[socket.id], data)

        if (type == "message") { // add to current and latest (already did this for join)
            var some = false
            for (var property in data) {
                some = true
                room.last.properties[property] = [socket.id, data[property]]
            }
            if (some) room.last.id = socket.id
        }
    }

    // HANDLE HISTORY

    socket.on("history", function (data) {
        var client = clients[socket.id]
        if (client && client.room) {
            var room = rooms[client.room]
            room.history += data
        }
    })

    socket.on("clearhistory", function () {
        var client = clients[socket.id]
        if (client && client.room) {
            var room = rooms[client.room]
            room.history = ""
        }
    })


    // HANDLE DISCONNECTION

    socket.on("disconnect", function () {
        removeFromRoom()
    })

    function removeFromRoom() { // used in disconnect and changeroom

        // need to distribute sender properties to all receivers in room
        // these would only distribute the same message to receivers so do not use them
        // io.sockets.in(data.room).emit("receive", data.message); // to all

        var clientLeaving = clients[socket.id]
        if (!clientLeaving) return
        var roomName = clientLeaving.room
        socket.leave(roomName)
        socket.broadcast.to(roomName).emit("otherleave", socket.id) // not to self

        var room = rooms[roomName]
        if (room) {
            delete room.sockets[socket.id]
            room.people--
            room.gone++

            var emptyCheck = true
            for (var i in room.sockets) {
                emptyCheck = false
                break
            }
            if (emptyCheck) { // everyone is gone from room
                rooms[roomName] = null
                var allEmptyCheck = true
                var appRooms = apps[clientLeaving.app][clientLeaving.roomRoot].rooms
                for (i = 0; i < appRooms.length; i++) {
                    if (rooms[appRooms[i]]) { // the room has not been emptied
                        allEmptyCheck = false
                        break
                    }
                }
                if (allEmptyCheck) { // all rooms empty, clear rooms for app
                    apps[clientLeaving.app][clientLeaving.roomRoot].rooms = []
                }
                clients[socket.id] = null
                return
            }
            delete room.current[socket.id]
            // leave last potentially with old id in data
        }
        clients[socket.id] = null
    }

    /*
    socket.on("error", function(e) {
        zog(e);
    });
    */
})


// HELPER FUNCTIONS

function zog(t) {
    console.log(t)
}

function zot(v) {
    if (v === null) return true
    return typeof v === "undefined"
}

function copy(o) {
    if (typeof o === "string" || typeof o === "number") return o
    var out, v, key
    out = Array.isArray(o) ? [] : {}
    for (key in o) {
        if (o.hasOwnProperty(key)) {
            v = o[key]
            out[key] = (typeof v === "object") ? copy(v) : v
        }
    }
    return out
}

function merge() {
    var obj = {}; var i; var j
    for (i = 0; i < arguments.length; i++) {
        for (j in arguments[i]) {
            if (arguments[i].hasOwnProperty(j)) {
                obj[j] = arguments[i][j]
            }
        }
    }
    return obj
}


// START THE SERVER


server.listen(app.get("port"), () => {
    console.log("running on " + app.get("port"))
})
